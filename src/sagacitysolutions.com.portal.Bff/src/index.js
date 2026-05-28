import "dotenv/config";
import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import cors from "cors";
import { getLogtoClient } from "./logto.js";

const app = express();
const PORT = process.env.PORT ?? 5000;
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
const PORTAL_API = process.env.PORTAL_API ?? "http://localhost:5092";

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 14 * 24 * 60 * 60 * 1000,
    },
  })
);

// Gateway route to downstream services
app.all("/api/*", async (req, res) => {
  const client = getLogtoClient(req.session, res);
  const isAuthenticated = await client.isAuthenticated();
  if (!isAuthenticated) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    // Get the token to access the downstream service
    const token = await client.getAccessToken(PORTAL_API);

    const headers = {
      Authorization: `Bearer ${token}`,
    };
    if (req.headers["content-type"]) {
      headers["Content-Type"] = req.headers["content-type"];
    }
    if (req.headers["accept"]) {
      headers["Accept"] = req.headers["accept"];
    }

    // Create a new request to the downstream service
    const downstreamRequest = new Request(`${PORTAL_API}${req.path}`, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : JSON.stringify(req.body),
    });

    const response = await fetch(downstreamRequest);

    // Set the response headers to match the downstream service
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    res.status(response.status);
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error("Downstream API fetch failed:", error);
    res.status(502).json({
      error: "Bad Gateway",
      message: "Unable to connect to the downstream service. Please ensure the backend WebApi is running.",
      details: error.message,
    });
  }
})

// ── Auth routes ───────────────────────────────────────────────────────────────

/**
 * GET /auth/login
 * Redirects the browser to the Logto authorization endpoint.
 * The redirect URI goes back through the Vite dev-server proxy so the
 * session cookie domain stays consistent (localhost:5173 throughout).
 */
app.get("/auth/login", async (req, res) => {
  const client = getLogtoClient(req.session, res);
  await client.signIn(`${BASE_URL}/auth/callback`);
});

/**
 * GET /auth/callback
 * Exchanges the authorization code for tokens and stores them in the session.
 */
app.get("/auth/callback", async (req, res) => {
  const client = getLogtoClient(req.session, res);
  const callbackUrl = `${BASE_URL}/auth/callback${req.url.slice(req.path.length)}`;

  try {
    await client.handleSignInCallback(callbackUrl);
    res.redirect(CLIENT_ORIGIN);
  } catch (err) {
    console.error("Callback error:", err);
    res.status(500).json({ error: "Authentication callback failed" });
  }
});

/**
 * GET /auth/logout
 * Clears the local session and redirects to Logto's end-session endpoint.
 */
app.get("/auth/logout", async (req, res) => {
  const client = getLogtoClient(req.session, res);
  req.session.destroy(async () => {
    await client.signOut(CLIENT_ORIGIN);
  });
});

// ── User / session API ────────────────────────────────────────────────────────

/**
 * GET /api/me
 * Returns the authenticated user's claims, or 401 if not signed in.
 */
app.get("/me", async (req, res) => {
  const client = getLogtoClient(req.session);

  const isAuthenticated = await client.isAuthenticated();
  if (!isAuthenticated) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const claims = await client.getIdTokenClaims();
  const accessTokenClaims = await client.getAccessTokenClaims(PORTAL_API);

  const username = claims.username || claims.name || claims.sub;
  let organizations = {};
  if (claims.organization_data && claims.organization_data.length) {
    organizations = claims.organization_data.reduce((orgs, current) => {
      orgs[current.id] = current.name;
      return orgs;
    }, {})
  }

  res.json({
    username,
    organizations,
    scope: accessTokenClaims?.scope,
    portal_project_ids: accessTokenClaims?.portal_project_ids || [],
  });
});

/**
 * GET /api/health
 */
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, "0.0.0.0", () => {
  console.log(`BFF listening on http://localhost:${PORT}`);
  console.log(`  Logto endpoint : ${process.env.LOGTO_ENDPOINT}`);
  console.log(`  Client origin  : ${CLIENT_ORIGIN}`);
});
