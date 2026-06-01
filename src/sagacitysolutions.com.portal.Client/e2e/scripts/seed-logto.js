import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to sleep
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log("🚀 Starting Logto Management API seeding script...");

  // 1. Determine container names
  let dbContainer = "sagacity-postgres-test";
  let logtoContainer = "sagacity-logto-test";

  try {
    const runningContainers = execSync("docker ps --format '{{.Names}}'", { encoding: "utf-8" });
    if (!runningContainers.includes("sagacity-postgres-test")) {
      dbContainer = "sagacitysolutionscomportal-postgres-1";
      logtoContainer = "sagacitysolutionscomportal-logto-1";
    }
  } catch (e) {
    console.warn("⚠️ Failed to list docker containers, defaulting to test container names.");
  }

  console.log(`🐳 Using Database Container: ${dbContainer}`);
  console.log(`🐳 Using Logto Container: ${logtoContainer}`);

  const m2mClientId = "e2e-m2m";
  const m2mClientSecret = "SecureSecret123!";

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
      aud: "http://localhost:3000/api/test",
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
        name: "Foo Bar",
        roles: [],
        avatar: "https://example.com/avatar.png",
        profile: {},
        username: "foo",
        customData: { projectIds: "1 2" },
        identities: {},
        hasPassword: false,
        primaryEmail: "foo@logto.io",
        primaryPhone: "+1234567890",
        applicationId: "my-app",
        organizations: [{ id: "asdfasdasdf", name: "Sagacity Solutions", description: "" }],
        ssoIdentities: [],
        organizationRoles: [],
        mfaVerificationFactors: []
      },
      grant: {
        type: "urn:ietf:params:oauth:grant-type:token-exchange",
        subjectTokenContext: { foo: "bar" }
      },
      application: {
        id: "my_app",
        name: "My App",
        type: "SPA",
        createdAt: 1779736543204,
        customData: { foo: "bar" },
        description: "My application",
        isThirdParty: false,
        oidcClientMetadata: { redirectUris: [], postLogoutRedirectUris: [] },
        customClientMetadata: {}
      },
      interaction: {
        userId: "123",
        signInContext: {
          city: "San Francisco",
          country: "US",
          botScore: "10",
          latitude: "37.7749",
          longitude: "-122.4194",
          botVerified: "false"
        },
        interactionEvent: "SignIn"
      }
    },
    blockIssuanceOnError: true
  };

  const escapedJwtConfigValue = JSON.stringify(jwtConfigValue).replace(/'/g, "''");

  try {
    // 2. Generate and run SQL bootstrap script in the Postgres container (idempotent & platform-independent)
    console.log("📝 Generating SQL bootstrap script...");
    const sqlContent = [
      `INSERT INTO applications (tenant_id, id, name, type, secret, oidc_client_metadata, custom_data) VALUES ('default', '${m2mClientId}', 'E2E Test Client', 'MachineToMachine', '${m2mClientSecret}', '{"redirectUris": [], "postLogoutRedirectUris": []}', '{}') ON CONFLICT DO NOTHING;`,
      `INSERT INTO applications (tenant_id, id, name, type, secret, oidc_client_metadata, custom_data) VALUES ('default', 'moxwjx3you2zdb4dglttg', 'BFF Client', 'Traditional', '7sAbhzKUoi42MtxZgEgIdU3LbQwTES1w', '{"redirectUris": ["http://localhost:5000/auth/callback"], "postLogoutRedirectUris": ["http://localhost:5173"]}', '{}') ON CONFLICT DO NOTHING;`,
      `INSERT INTO application_secrets (tenant_id, application_id, name, value) VALUES ('default', '${m2mClientId}', 'Default secret', '${m2mClientSecret}') ON CONFLICT DO NOTHING;`,
      `INSERT INTO application_secrets (tenant_id, application_id, name, value) VALUES ('default', 'moxwjx3you2zdb4dglttg', 'Default secret', '7sAbhzKUoi42MtxZgEgIdU3LbQwTES1w') ON CONFLICT DO NOTHING;`,
      `INSERT INTO applications_roles (tenant_id, id, application_id, role_id) VALUES ('default', 'e2e-m2m-link', '${m2mClientId}', 'admin-role') ON CONFLICT DO NOTHING;`,
      `INSERT INTO application_user_consent_resource_scopes (tenant_id, application_id, scope_id) VALUES ('default', '${m2mClientId}', 'management-api-all') ON CONFLICT DO NOTHING;`,
      `INSERT INTO organizations (tenant_id, id, name, description) VALUES ('default', 'tenant-1', 'Acme Corporation', 'E2E Testing Organization') ON CONFLICT DO NOTHING;`,
      `UPDATE logto_configs SET value = '{"enabledExtendedClaims": ["roles", "organizations", "organization_roles", "organization_data", "custom_data"]}' WHERE key = 'idToken' AND tenant_id = 'default';`,
      `INSERT INTO logto_configs (tenant_id, key, value) VALUES ('default', 'jwt.accessToken', '${escapedJwtConfigValue}') ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;`
    ].join("\n");

    const tempSqlFile = path.join(__dirname, "bootstrap.sql");
    fs.writeFileSync(tempSqlFile, sqlContent, "utf-8");
    console.log("✅ SQL bootstrap script generated locally.");

    console.log(`📤 Copying bootstrap script into ${dbContainer}...`);
    execSync(`docker cp "${tempSqlFile}" ${dbContainer}:/tmp/bootstrap.sql`);
    
    console.log("⚙️ Executing SQL bootstrap script inside DB container...");
    execSync(`docker exec -t ${dbContainer} psql -U logto -d logto -f /tmp/bootstrap.sql`);
    console.log("✅ Database pre-bootstrap complete!");

    // Clean up local temp file
    try {
      fs.unlinkSync(tempSqlFile);
    } catch (e) {
      // Ignore cleanup error
    }

    // 5. Restart Logto to reload DB secrets cache
    console.log("🔄 Restarting Logto container to flush secrets cache...");
    execSync(`docker restart ${logtoContainer}`, { encoding: "utf-8" });
    console.log("✅ Restart command sent successfully.");

    // Wait a brief moment to ensure container shuts down/reboots
    console.log("⏳ Cooling down for container reboot...");
    await sleep(4000);

    // 6. Wait for Logto to reboot and become responsive
    console.log("⏳ Waiting for Logto OIDC server to reboot and become responsive...");
    let logtoReady = false;
    for (let i = 0; i < 20; i++) {
      try {
        const res = await fetch("http://localhost:3001/oidc/.well-known/openid-configuration");
        if (res.ok) {
          logtoReady = true;
          break;
        }
      } catch (e) {
        // Not ready yet
      }
      await sleep(1500);
      console.log(`...still waiting (${i * 1.5}s elapsed)`);
    }

    if (!logtoReady) {
      throw new Error("Logto server did not become responsive within timeout.");
    }
    console.log("✅ Logto OIDC server is healthy and responsive!");

    // 6.5. Seed projects in the web API database (sagacitysolutions)
    console.log("⚙️ Seeding default projects in sagacitysolutions database...");
    const appSqlContent = [
      `DELETE FROM "WorkTask";`,
      `DELETE FROM "Project";`
    ].join("\n");

    const tempAppSqlFile = path.join(__dirname, "bootstrap_app.sql");
    fs.writeFileSync(tempAppSqlFile, appSqlContent, "utf-8");
    
    console.log(`📤 Copying app bootstrap script into ${dbContainer}...`);
    execSync(`docker cp "${tempAppSqlFile}" ${dbContainer}:/tmp/bootstrap_app.sql`);
    
    console.log("⚙️ Executing app bootstrap script inside DB container...");
    execSync(`docker exec -t ${dbContainer} psql -U logto -d sagacitysolutions -f /tmp/bootstrap_app.sql`);
    
    try {
      fs.unlinkSync(tempAppSqlFile);
    } catch (e) {
      // Ignore
    }
    console.log("✅ App database projects seeded successfully!");

  } catch (error) {
    console.error("❌ Pre-bootstrap configuration failed:", error.message);
    process.exit(1);
  }

  // Configuration settings
  const LOGTO_ENDPOINT = "http://localhost:3001";

  try {
    // 7. Fetch Management API Access Token
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
      throw new Error(`Failed to authenticate with Management API: ${tokenResponse.statusText} - ${errorText}`);
    }

    const { access_token: token } = await tokenResponse.json();
    console.log("✅ Authenticated successfully!");

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };


    // 8. Ensure API Resource exists (http://localhost:5092)
    console.log("🌐 Ensuring WebApi Resource (http://localhost:5092) is registered...");
    const resourcesResponse = await fetch(`${LOGTO_ENDPOINT}/api/resources`, { headers });
    const resources = await resourcesResponse.json();

    if (!Array.isArray(resources)) {
      throw new Error(`Management API GET /api/resources returned invalid response: ${JSON.stringify(resources)}`);
    }

    let portalResource = resources.find((r) => r.indicator === "http://localhost:5092");
    if (portalResource) {
      console.log("🗑️ Portal API Resource already exists. Deleting to reset state...");
      const deleteResponse = await fetch(`${LOGTO_ENDPOINT}/api/resources/${portalResource.id}`, {
        method: "DELETE",
        headers,
      });
      if (!deleteResponse.ok) {
        console.warn(`⚠️ Warning: Failed to delete API resource: ${deleteResponse.statusText}`);
      } else {
        console.log(`✅ Deleted API resource successfully.`);
      }
    }

    console.log("➕ Creating Portal API Resource...");
    const createResourceResponse = await fetch(`${LOGTO_ENDPOINT}/api/resources`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Portal Api",
        indicator: "http://localhost:5092",
      }),
    });
    if (!createResourceResponse.ok) {
      const err = await createResourceResponse.text();
      throw new Error(`Failed to create API resource: ${err}`);
    }
    portalResource = await createResourceResponse.json();
    console.log("✅ Portal API Resource created!");

    console.log("➕ Adding scopes to Portal API Resource...");
    const addScope = async (name, description) => {
      const res = await fetch(`${LOGTO_ENDPOINT}/api/resources/${portalResource.id}/scopes`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name, description }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Failed to create scope ${name}: ${err}`);
      }
      console.log(`✅ Scope '${name}' created.`);
    };

    await addScope("read:projects", "Read project list and details");
    await addScope("write:projects", "Create, edit, or delete projects");
    await addScope("read:tasks", "Read task list and details");
    await addScope("write:tasks", "Create, edit, or delete tasks");

    // Fetch the portal resource detailed scopes to get their IDs
    const resourceDetailResponse = await fetch(`${LOGTO_ENDPOINT}/api/resources/${portalResource.id}/scopes`, { headers });
    const scopes = await resourceDetailResponse.json();
    console.log("DEBUG: fetched scopes =", JSON.stringify(scopes, null, 2));

    const readScope = scopes.find((s) => s.name === "read:projects");
    const writeScope = scopes.find((s) => s.name === "write:projects");
    const readTasksScope = scopes.find((s) => s.name === "read:tasks");
    const writeTasksScope = scopes.find((s) => s.name === "write:tasks");

    if (!readScope || !writeScope || !readTasksScope || !writeTasksScope) {
      throw new Error("API Resource scopes read:projects, write:projects, read:tasks, or write:tasks could not be retrieved.");
    }

    // 9. Ensure Organization exists (tenant-1: Acme Corporation)
    console.log("🏢 Ensuring Organization 'tenant-1' (Acme Corporation) exists...");
    const orgsResponse = await fetch(`${LOGTO_ENDPOINT}/api/organizations`, { headers });
    const orgs = await orgsResponse.json();

    let tenantOrg = orgs.find((o) => o.id === "tenant-1");
    if (!tenantOrg) {
      console.log("➕ Organization 'tenant-1' not found. Creating...");
      const createOrgResponse = await fetch(`${LOGTO_ENDPOINT}/api/organizations`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          id: "tenant-1",
          name: "Acme Corporation",
        }),
      });
      if (!createOrgResponse.ok) {
        const err = await createOrgResponse.text();
        throw new Error(`Failed to create organization: ${err}`);
      }
      tenantOrg = await createOrgResponse.json();
      console.log("✅ Organization 'tenant-1' created!");
    } else {
      console.log("✅ Organization 'tenant-1' already exists.");
    }

    // 10. Ensure Roles exist (Portal Admin, Portal Viewer)
    console.log("🛡️ Ensuring Portal Admin and Portal Viewer Roles exist...");
    const rolesResponse = await fetch(`${LOGTO_ENDPOINT}/api/roles`, { headers });
    const roles = await rolesResponse.json();

    let adminRole = roles.find((r) => r.name === "Portal Admin");
    if (adminRole) {
      console.log("🗑️ Portal Admin Role already exists. Deleting to reset state...");
      const deleteResponse = await fetch(`${LOGTO_ENDPOINT}/api/roles/${adminRole.id}`, {
        method: "DELETE",
        headers,
      });
      if (!deleteResponse.ok) {
        console.warn(`⚠️ Warning: Failed to delete Portal Admin Role: ${deleteResponse.statusText}`);
      } else {
        console.log(`✅ Deleted Portal Admin Role successfully.`);
      }
    }

    console.log("➕ Creating Portal Admin Role...");
    const createAdminRoleResponse = await fetch(`${LOGTO_ENDPOINT}/api/roles`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Portal Admin",
        description: "Full access to portal projects",
        scopeIds: [readScope.id, writeScope.id, readTasksScope.id, writeTasksScope.id],
      }),
    });
    if (!createAdminRoleResponse.ok) {
      const err = await createAdminRoleResponse.text();
      throw new Error(`Failed to create Portal Admin Role: ${err}`);
    }
    adminRole = await createAdminRoleResponse.json();
    console.log("✅ Portal Admin Role created!");

    let viewerRole = roles.find((r) => r.name === "Portal Viewer");
    if (viewerRole) {
      console.log("🗑️ Portal Viewer Role already exists. Deleting to reset state...");
      const deleteResponse = await fetch(`${LOGTO_ENDPOINT}/api/roles/${viewerRole.id}`, {
        method: "DELETE",
        headers,
      });
      if (!deleteResponse.ok) {
        console.warn(`⚠️ Warning: Failed to delete Portal Viewer Role: ${deleteResponse.statusText}`);
      } else {
        console.log(`✅ Deleted Portal Viewer Role successfully.`);
      }
    }

    console.log("➕ Creating Portal Viewer Role...");
    const createViewerRoleResponse = await fetch(`${LOGTO_ENDPOINT}/api/roles`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Portal Viewer",
        description: "Read-only access to portal projects",
        scopeIds: [readScope.id, readTasksScope.id],
      }),
    });
    if (!createViewerRoleResponse.ok) {
      const err = await createViewerRoleResponse.text();
      throw new Error(`Failed to create Portal Viewer Role: ${err}`);
    }
    viewerRole = await createViewerRoleResponse.json();
    console.log("✅ Portal Viewer Role created!");

    // 11. Provision Predefined Test Users
    const testUsers = [
      {
        username: "e2e_consultant",
        email: "consultant@sagacitysolutions.com",
        password: "SecurePassword123!",
        customData: { projectIds: "*" },
        orgId: "tenant-1",
        roleId: adminRole.id,
      },
      {
        username: "e2e_viewer",
        email: "viewer@sagacitysolutions.com",
        password: "SecurePassword123!",
        customData: { projectIds: "*" },
        orgId: "tenant-1",
        roleId: viewerRole.id,
      },
      {
        username: "e2e_unauthorized",
        email: "unauthorized@sagacitysolutions.com",
        password: "SecurePassword123!",
        customData: {},
        orgId: null,
        roleId: null,
      },
    ];

    for (const user of testUsers) {
      console.log(`👤 Provisioning user '${user.username}'...`);

      // Search for existing user to delete (guarantees a pristine state)
      const usersSearchResponse = await fetch(`${LOGTO_ENDPOINT}/api/users?search=${user.username}`, { headers });
      const foundUsers = await usersSearchResponse.json();
      const existingUser = foundUsers.find((u) => u.username === user.username);

      if (existingUser) {
        console.log(`🗑️ User '${user.username}' already exists. Deleting to reset state...`);
        const deleteResponse = await fetch(`${LOGTO_ENDPOINT}/api/users/${existingUser.id}`, {
          method: "DELETE",
          headers,
        });
        if (!deleteResponse.ok) {
          console.warn(`⚠️ Warning: Failed to delete user: ${deleteResponse.statusText}`);
        } else {
          console.log(`✅ Deleted user '${user.username}' successfully.`);
        }
      }

      // Create new clean user
      const createUserResponse = await fetch(`${LOGTO_ENDPOINT}/api/users`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          username: user.username,
          primaryEmail: user.email,
          password: user.password,
          customData: user.customData,
        }),
      });

      if (!createUserResponse.ok) {
        const err = await createUserResponse.text();
        throw new Error(`Failed to create user ${user.username}: ${err}`);
      }

      const createdUser = await createUserResponse.json();
      console.log(`✅ User '${user.username}' created.`);

      // Link to Organization if applicable
      if (user.orgId) {
        console.log(`🏢 Adding user '${user.username}' to organization '${user.orgId}'...`);
        const addOrgUserResponse = await fetch(`${LOGTO_ENDPOINT}/api/organizations/${user.orgId}/users`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            userIds: [createdUser.id],
          }),
        });
        if (!addOrgUserResponse.ok) {
          const err = await addOrgUserResponse.text();
          throw new Error(`Failed to add user to organization: ${err}`);
        }
        console.log("✅ Organization linked.");
      }

      // Link Role if applicable
      if (user.roleId) {
        console.log(`🛡️ Assigning role to user '${user.username}'...`);
        const addRoleUserResponse = await fetch(`${LOGTO_ENDPOINT}/api/users/${createdUser.id}/roles`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            roleIds: [user.roleId],
          }),
        });
        if (!addRoleUserResponse.ok) {
          const err = await addRoleUserResponse.text();
          throw new Error(`Failed to assign role to user: ${err}`);
        }
        console.log("✅ Role assigned.");
      }
    }

    console.log("🎉 Logto Management API seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed with error:", error);
    process.exit(1);
  }
}

run();
