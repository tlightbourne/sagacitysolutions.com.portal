import { Page } from "@playwright/test";

export async function authenticateSession(page: Page) {
  if (process.env.MOCK_API === "false") {
    // Real SSO login sequence:
    await page.goto("/");
    await page.click(".btn-signin");
    
    // Fill credentials if redirected to login form
    if (await page.locator("input[type='email'], input[name='username']").first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await page.locator("input[type='email'], input[name='username']").first().fill("ci_test_user");
      await page.locator("input[type='password']").first().fill("SecurePassword123!");
      await page.locator("button[type='submit']").first().click();
    }
  } else {
    // Mock E2E Auth: Bypasses external SSO redirects.
    // The mocked '/me' endpoint (setup in mockRoutes.ts) returns the authenticated claims instantly.
    await page.goto("/");
  }
}
