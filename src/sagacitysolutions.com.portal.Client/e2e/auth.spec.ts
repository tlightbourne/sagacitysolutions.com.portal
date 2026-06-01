import { test, expect } from "@playwright/test";
import { mockMe } from "./mockRoutes";

test.describe("Portal E2E - Unauthenticated Flow", () => {
  test("should display welcome view when unauthenticated", async ({ page }) => {
    // Intercept /me to return unauthenticated status specifically for this test
    await mockMe(page, null);

    await page.goto("/");

    const welcomeCard = page.locator(".welcome-glass-card");
    await expect(welcomeCard).toBeVisible();
    await expect(page.locator("h2")).toContainText("Sagacity Solutions");
    await expect(page.locator("p")).toContainText("Welcome to the project portal");

    const signinBtn = page.locator(".btn-signin");
    await expect(signinBtn).toBeVisible();
    await expect(signinBtn).toContainText("Secure Sign In");
  });
});
