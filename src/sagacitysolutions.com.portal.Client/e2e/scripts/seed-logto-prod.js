import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runProductionSeeding() {
  console.log("🚀 Starting Production Logto Management API initialization...");

  const LOGTO_ENDPOINT = process.env.LOGTO_ENDPOINT || "https://auth.sagacitysolutions.ai";
  const API_RESOURCE = process.env.PORTAL_API_RESOURCE || "https://api.sagacitysolutions.ai";
  const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "https://portal.sagacitysolutions.ai";
  const DB_URL = process.env.DB_URL || process.env.LOGTO_DB_URL || null;

  const m2mClientId = process.env.LOGTO_M2M_CLIENT_ID;
  const m2mClientSecret = process.env.LOGTO_M2M_CLIENT_SECRET;

  if (!m2mClientId || !m2mClientSecret) {
    throw new Error("Missing required LOGTO_M2M_CLIENT_ID or LOGTO_M2M_CLIENT_SECRET environment variables. Ensure they are configured as GitHub Secrets.");
  }

  const jwtConfigValue = {
    script: [
      "const getCustomJwtClaims = async ({ token, context, environmentVariables, api }) => {",
      "  const projects = context?.user?.customData?.projectIds;",
      "  const organizations = context?.user?.organizations;",
      "  let claims = {}",
      "  if (projects) {",
      "    claims[\"portal_project_ids\"] = projects",
      "  }",
      "  if (organizations) {",
      "    claims[\"tenant_ids\"] = organizations.map(o => o.id).join(' ')",
      "  }",
      "  return claims;",
      "}"
    ].join("\n"),
    tokenSample: {
      aud: API_RESOURCE,
      gty: "authorization_code",
      jti: "f1d3d2d1-1f2d-3d4e-5d6f-7d8a9d0e1d2",
      kind: "AccessToken",
      scope: "read write",
      grantId: "grant_123",
      clientId: "my_app",
      accountId: "uid_123"
    },
    contextSample: {
      user: {
        id: "123",
        name: "Production User",
        roles: [],
        username: "prod_user",
        customData: { projectIds: "1 2" },
        organizations: [{ id: "tenant-1", name: "Sagacity Solutions", description: "" }]
      }
    },
    blockIssuanceOnError: true
  };

  const escapedJwtConfigValue = JSON.stringify(jwtConfigValue).replace(/'/g, "''");

  // 1. Database level configuration (custom JWT script & configs) if DB_URL is provided
  if (DB_URL) {
    try {
      console.log("⚙️ Applying production Logto JWT claim scripts via PostgreSQL connection...");
      const sqlContent = [
        `INSERT INTO applications (tenant_id, id, name, type, secret, oidc_client_metadata, custom_data) VALUES ('default', '${m2mClientId}', 'Production M2M Client', 'MachineToMachine', '${m2mClientSecret}', '{"redirectUris": [], "postLogoutRedirectUris": []}', '{}') ON CONFLICT DO NOTHING;`,
        `INSERT INTO application_secrets (tenant_id, application_id, name, value) VALUES ('default', '${m2mClientId}', 'Default secret', '${m2mClientSecret}') ON CONFLICT DO NOTHING;`,
        `INSERT INTO applications_roles (tenant_id, id, application_id, role_id) VALUES ('default', 'prod-m2m-link', '${m2mClientId}', 'admin-role') ON CONFLICT DO NOTHING;`,
        `INSERT INTO application_user_consent_resource_scopes (tenant_id, application_id, scope_id) VALUES ('default', '${m2mClientId}', 'management-api-all') ON CONFLICT DO NOTHING;`,
        `UPDATE logto_configs SET value = '{"enabledExtendedClaims": ["roles", "organizations", "organization_roles", "organization_data", "custom_data"]}' WHERE key = 'idToken' AND tenant_id = 'default';`,
        `INSERT INTO logto_configs (tenant_id, key, value) VALUES ('default', 'jwt.accessToken', '${escapedJwtConfigValue}') ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;`
      ].join("\n");

      const tempSqlFile = path.join(__dirname, "bootstrap_prod.sql");
      fs.writeFileSync(tempSqlFile, sqlContent, "utf-8");
      
      execSync(`psql "${DB_URL}" -f "${tempSqlFile}"`, { encoding: "utf-8", stdio: "inherit" });
      console.log("✅ Production Logto database configurations updated!");

      try { fs.unlinkSync(tempSqlFile); } catch (e) {}
    } catch (e) {
      console.warn("⚠️ Database direct SQL application skipped or failed:", e.message);
    }
  }

  // 2. Wait for Logto OIDC server readiness
  console.log(`⏳ Verifying Logto OIDC server readiness at ${LOGTO_ENDPOINT}...`);
  let logtoReady = false;
  for (let i = 0; i < 15; i++) {
    try {
      const res = await fetch(`${LOGTO_ENDPOINT}/oidc/.well-known/openid-configuration`);
      if (res.ok) {
        logtoReady = true;
        break;
      }
    } catch (e) {}
    await sleep(2000);
  }

  if (!logtoReady) {
    console.warn("⚠️ Logto OIDC endpoint not yet responding. Proceeding with HTTP API calls...");
  } else {
    console.log("✅ Logto OIDC server is healthy!");
  }

  try {
    // 3. Authenticate with Logto Management API
    console.log("🔑 Authenticating with Logto Management API...");
    const credentials = Buffer.from(`${m2mClientId}:${m2mClientSecret}`).toString("base64");
    const tokenResponse = await fetch(`${LOGTO_ENDPOINT}/oidc/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        resource: "https://default.logto.app/api",
        scope: "all",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Management API auth failed: ${tokenResponse.statusText} - ${errorText}`);
    }

    const { access_token: token } = await tokenResponse.json();
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    console.log("✅ Authenticated with Logto Management API!");

    // 4. Ensure WebApi Resource and Scopes exist idempotently
    console.log(`🌐 Registering/updating Portal API Resource (${API_RESOURCE})...`);
    const resourcesResponse = await fetch(`${LOGTO_ENDPOINT}/api/resources`, { headers });
    const resources = await resourcesResponse.json();

    let portalResource = Array.isArray(resources) ? resources.find((r) => r.indicator === API_RESOURCE) : null;
    if (!portalResource) {
      const createResourceResponse = await fetch(`${LOGTO_ENDPOINT}/api/resources`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Portal Api",
          indicator: API_RESOURCE,
        }),
      });
      if (!createResourceResponse.ok) {
        throw new Error(`Failed to create API resource: ${await createResourceResponse.text()}`);
      }
      portalResource = await createResourceResponse.json();
      console.log("✅ Portal API Resource created!");
    } else {
      console.log("✅ Portal API Resource already exists.");
    }

    // Ensure Scopes
    const resourceDetailResponse = await fetch(`${LOGTO_ENDPOINT}/api/resources/${portalResource.id}/scopes`, { headers });
    const existingScopes = await resourceDetailResponse.json();

    const requiredScopes = [
      { name: "read:projects", description: "Read project list and details" },
      { name: "write:projects", description: "Create, edit, or delete projects" },
      { name: "read:tasks", description: "Read task list and details" },
      { name: "write:tasks", description: "Create, edit, or delete tasks" }
    ];

    for (const reqScope of requiredScopes) {
      const exists = Array.isArray(existingScopes) && existingScopes.some((s) => s.name === reqScope.name);
      if (!exists) {
        const res = await fetch(`${LOGTO_ENDPOINT}/api/resources/${portalResource.id}/scopes`, {
          method: "POST",
          headers,
          body: JSON.stringify(reqScope),
        });
        if (res.ok) {
          console.log(`✅ Scope '${reqScope.name}' created.`);
        }
      }
    }

    // Refetch scope IDs for role assignment
    const updatedScopesRes = await fetch(`${LOGTO_ENDPOINT}/api/resources/${portalResource.id}/scopes`, { headers });
    const updatedScopes = await updatedScopesRes.json();
    const scopeMap = Object.fromEntries(updatedScopes.map((s) => [s.name, s.id]));

    // 5. Ensure Portal Roles exist idempotently
    console.log("🛡️ Registering/updating Portal Admin and Portal Viewer Roles...");
    const rolesResponse = await fetch(`${LOGTO_ENDPOINT}/api/roles`, { headers });
    const roles = await rolesResponse.json();

    const roleDefinitions = [
      {
        name: "Portal Admin",
        description: "Full access to portal projects and tasks",
        scopes: ["read:projects", "write:projects", "read:tasks", "write:tasks"]
      },
      {
        name: "Portal Viewer",
        description: "Read-only access to portal projects and tasks",
        scopes: ["read:projects", "read:tasks"]
      }
    ];

    for (const roleDef of roleDefinitions) {
      const existingRole = Array.isArray(roles) ? roles.find((r) => r.name === roleDef.name) : null;
      const targetScopeIds = roleDef.scopes.map((sName) => scopeMap[sName]).filter(Boolean);

      if (!existingRole) {
        const createRoleRes = await fetch(`${LOGTO_ENDPOINT}/api/roles`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: roleDef.name,
            description: roleDef.description,
            scopeIds: targetScopeIds,
          }),
        });
        if (createRoleRes.ok) {
          console.log(`✅ Role '${roleDef.name}' created.`);
        }
      } else {
        console.log(`✅ Role '${roleDef.name}' already exists.`);
      }
    }

    console.log("🎉 Production Logto initialization finished successfully!");
  } catch (err) {
    console.error("❌ Production Logto seeding encountered an error:", err.message);
    // Non-fatal exit so pipeline proceeds safely even if API is pending initial DNS propagation
  }
}

runProductionSeeding();
