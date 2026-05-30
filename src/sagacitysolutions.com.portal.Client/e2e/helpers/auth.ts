import { Page } from "@playwright/test";
import { mockMe, TestUserClaims } from "../mockRoutes";

export interface TestUser {
  username: string;
  password?: string;
  organizations: Record<string, string>;
  portal_project_ids: string[];
  scope: string;
}

export const PREDEFINED_USERS: Record<string, TestUser> = {
  consultant: {
    username: "e2e_consultant",
    password: "SecurePassword123!",
    organizations: {
      "tenant-1": "Acme Corporation",
    },
    portal_project_ids: ["*"],
    scope: "read:projects write:projects read:tasks write:tasks",
  },
  viewer: {
    username: "e2e_viewer",
    password: "SecurePassword123!",
    organizations: {
      "tenant-1": "Acme Corporation",
    },
    portal_project_ids: ["*"],
    scope: "read:projects read:tasks",
  },
  unauthorized: {
    username: "e2e_unauthorized",
    password: "SecurePassword123!",
    organizations: {},
    portal_project_ids: [],
    scope: "",
  },
};

/**
 * Authenticates the session.
 * - In Mock Mode: Automatically mocks `/me` with the provided test user claims.
 * - In Live Mode: Orchestrates the actual SSO login using the test user's credentials.
 */
export async function authenticateSession(page: Page, user: TestUser = PREDEFINED_USERS.consultant) {
  if (process.env.MOCK_API === "false") {
    // Real SSO login sequence:
    await page.goto("/");
    
    // If not authenticated, we expect a redirection or sign-in action to trigger the SSO flow
    const signinBtn = page.locator(".btn-signin");
    if (await signinBtn.isVisible()) {
      await signinBtn.click();
    }
    
    // Wait for redirection to the Logto login form to complete
    const usernameSelector = "input[name='username'], input[name='identifier'], input[type='text'], input[type='email']";
    try {
      await page.waitForSelector(usernameSelector, { timeout: 15000 });
    } catch (e) {
      console.warn("⚠️ Timeout waiting for Logto login form to appear.");
    }

    const usernameInput = page.locator(usernameSelector).first();
    if (await usernameInput.isVisible()) {
      await usernameInput.fill(user.username);
      
      const passwordInput = page.locator("input[name='password'], input[type='password']").first();
      await passwordInput.fill(user.password || "SecurePassword123!");
      
      const submitBtn = page.locator("button[type='submit']").first();
      await submitBtn.click();
    }
  } else {
    // Mock E2E Auth:
    // Configure the granular mock endpoint /me with this user's custom claim profile
    const claims: TestUserClaims = {
      username: user.username,
      organizations: user.organizations,
      portal_project_ids: user.portal_project_ids,
      scope: user.scope,
    };
    await mockMe(page, claims);
    await page.goto("/");
  }
}
