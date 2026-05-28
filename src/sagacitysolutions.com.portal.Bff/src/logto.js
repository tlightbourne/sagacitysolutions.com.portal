/**
 * Logto client factory.
 *
 * @logto/node requires a per-request storage adapter that reads/writes to the
 * current Express session, and a navigate function that performs the redirect.
 * We create a new LogtoClient for every request so the session binding is fresh.
 */

import LogtoClient, { UserScope } from "@logto/node";

/**
 * Build a session-backed storage adapter for @logto/node.
 * The SDK stores its internal state (tokens, code-verifier, …) here.
 */
function makeStorage(session) {
  return {
    getItem: (key) => session[key] ?? null,
    setItem: (key, value) => {
      session[key] = value;
    },
    removeItem: (key) => {
      delete session[key];
    },
  };
}

/**
 * Returns a LogtoClient bound to the given Express request/response pair.
 *
 * The `navigate` adapter is called by the SDK when it needs to redirect the
 * browser (sign-in, sign-out). We redirect immediately via the response object.
 */
export function getLogtoClient(session, res) {
  return new LogtoClient(
    {
      endpoint: process.env.LOGTO_ENDPOINT,
      appId: process.env.LOGTO_APP_ID,
      appSecret: process.env.LOGTO_APP_SECRET,
      resources: [process.env.PORTAL_API],
      scopes: [
        UserScope.Organizations,
        UserScope.OrganizationRoles,
        UserScope.CustomData,
        UserScope.Roles,
        "read:projects",
        "write:projects",
        "read:tasks",
        "write:tasks"
      ],
    },
    {
      storage: makeStorage(session),
      navigate: (url) => {
        if (res && !res.headersSent) {
          res.redirect(url);
        }
      },
    }
  );
}
