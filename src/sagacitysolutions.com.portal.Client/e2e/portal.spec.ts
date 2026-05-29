import { test, expect } from "@playwright/test";

test.describe("Portal E2E Smoke Test", () => {
  test("should display welcome view when unauthenticated", async ({ page }) => {
    // Navigate to the portal index route
    await page.goto("/");

    // Verify unauthenticated welcome view container exists
    const welcomeCard = page.locator(".welcome-glass-card");
    await expect(welcomeCard).toBeVisible();

    // Verify title and description
    await expect(page.locator("h2")).toContainText("Sagacity Solutions");
    await expect(page.locator("p")).toContainText("Welcome to the project portal");

    // Verify sign-in button is present and clickable
    const signinBtn = page.locator(".btn-signin");
    await expect(signinBtn).toBeVisible();
    await expect(signinBtn).toContainText("Secure Sign In");
  });
});
