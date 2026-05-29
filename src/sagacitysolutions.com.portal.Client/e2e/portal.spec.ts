import { test, expect } from "@playwright/test";
import { setupMockRoutes } from "./mockRoutes";
import { authenticateSession } from "./helpers/auth";

test.describe("Portal E2E - Unauthenticated Flow", () => {
  test("should display welcome view when unauthenticated", async ({ page }) => {
    // Intercept /me to return unauthenticated status specifically for this test
    if (process.env.MOCK_API !== "false") {
      await page.route("**/me", async (route) => {
        await route.fulfill({ status: 401 });
      });
    }

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

test.describe("Portal E2E - Authenticated Flow", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Setup network mock routes if in mock mode
    if (process.env.MOCK_API !== "false") {
      await setupMockRoutes(page);
    }
  });

  test("should load dashboard, list projects, select project, create a project, and delete it", async ({ page }) => {
    // 2. Perform conditional authentication
    await authenticateSession(page);

    // 3. Verify Header and Layout load authenticated state
    await expect(page.locator(".user-name")).toContainText("e2e_consultant");
    await expect(page.locator(".org-indicator")).toContainText("Acme Corporation");

    // 4. Verify Project list in Sidebar panel
    const sidebar = page.locator(".projects-panel");
    await expect(sidebar).toBeVisible();

    const projectCards = sidebar.locator(".project-card");
    await expect(projectCards).toHaveCount(2);
    await expect(projectCards.nth(0)).toContainText("Acme Corp Cloud Migration");
    await expect(projectCards.nth(1)).toContainText("Fintech Core Ledger API");

    // 5. Select first project and verify tasks loading in columns
    await projectCards.nth(0).click();

    // Verify task panel header
    await expect(page.locator(".active-project-info h2")).toContainText("Acme Corp Cloud Migration");

    // Verify task card loaded under "Completed" column
    const completedColumn = page.locator(".tasks-column", { hasText: "Completed" });
    await expect(completedColumn.locator(".task-card")).toContainText("Set up AWS Landing Zone");

    // Verify task card loaded under "In Progress" column
    const inProgressColumn = page.locator(".tasks-column", { hasText: "In Progress" });
    await expect(inProgressColumn.locator(".task-card")).toContainText("Dockerize existing Node.js");

    // 6. Test Creation of a new project (Write scope available)
    const addProjectBtn = page.locator(".btn-add-project");
    await expect(addProjectBtn).toBeVisible();
    await addProjectBtn.click();

    const modal = page.locator(".modal-overlay");
    await expect(modal).toBeVisible();
    
    // Fill in create form details
    await modal.locator("input[type='text']").fill("New E2E Project");
    await modal.locator("select").selectOption({ value: "tenant-1" });
    await modal.locator("button[type='submit']").click();

    // Wait for modal unmount
    await expect(modal).not.toBeVisible();

    // Verify new project has been appended and selected
    await expect(projectCards).toHaveCount(3);
    await expect(page.locator(".active-project-info h2")).toContainText("New E2E Project");

    // 7. Test Deletion of the new project
    // Setup dialog handler to automatically accept standard confirm alert
    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Are you sure you want to delete");
      await dialog.accept();
    });

    const activeProjectCard = page.locator(".project-card.active");
    const deleteBtn = activeProjectCard.locator(".btn-delete-project-new");
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Verify project has been cleanly removed from list
    await expect(projectCards).toHaveCount(2);
  });
});
