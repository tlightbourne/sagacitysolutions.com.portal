import { test, expect } from "@playwright/test";
import { authenticateSession, PREDEFINED_USERS } from "./helpers/auth";
import {
  mockMe,
  mockGetProjects,
  mockCreateProject,
  mockGetTasks,
  mockDeleteProject,
} from "./mockRoutes";
import {
  createProject,
  deleteActiveProject,
  selectProject,
  verifyProjectsList,
  verifyActiveProjectName,
  verifyTasksInColumn,
  verifyUserSession,
} from "./helpers/project";

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

test.describe("Portal E2E - Authenticated Flow", () => {
  test("should load dashboard, list projects, select project, create a project, and delete it", async ({ page }) => {
    const user = PREDEFINED_USERS.consultant;

    // 1. Setup dynamic, test-scoped project and task state in-memory
    const testProjects = [
      {
        id: "11111111-1111-1111-1111-111111111111",
        tenantId: "tenant-1",
        name: "Acme Corp Cloud Migration",
        status: "Active",
      },
      {
        id: "22222222-2222-2222-2222-222222222222",
        tenantId: "tenant-1",
        name: "Fintech Core Ledger API",
        status: "Active",
      },
    ];

    const testTasks = [
      {
        id: "t1",
        projectId: "11111111-1111-1111-1111-111111111111",
        title: "Set up AWS Landing Zone & IAM Roles",
        type: "Research",
        status: "Completed",
        hours: 12,
        order: 1,
      },
      {
        id: "t2",
        projectId: "11111111-1111-1111-1111-111111111111",
        title: "Dockerize existing Node.js Microservices",
        type: "Development",
        status: "InProgress",
        hours: 18,
        order: 2,
      },
    ];

    // 2. Register granular, test-specific mocks
    await mockGetProjects(page, testProjects);
    await mockGetTasks(page, "11111111-1111-1111-1111-111111111111", testTasks);
    await mockDeleteProject(page);

    // Support reactive mocked collection state changes for the CREATE project endpoint
    await mockCreateProject(page, (body) => {
      const newProj = {
        id: "33333333-3333-3333-3333-333333333333",
        tenantId: body.tenantId || "tenant-1",
        name: body.name || "Newly Mocked Project",
        status: "Proposed",
      };
      testProjects.push(newProj);
      return newProj;
    });

    // 3. Perform session authentication
    await authenticateSession(page, user);

    // 4. Verify authenticated session header and layout
    await verifyUserSession(page, user.username, "Acme Corporation");

    // 5. Verify the project list matches expected
    await verifyProjectsList(page, ["Acme Corp Cloud Migration", "Fintech Core Ledger API"]);

    // 6. Select first project and verify its tasks load in corresponding columns
    await selectProject(page, 0);
    await verifyActiveProjectName(page, "Acme Corp Cloud Migration");
    await verifyTasksInColumn(page, "Completed", ["Set up AWS Landing Zone & IAM Roles"]);
    await verifyTasksInColumn(page, "In Progress", ["Dockerize existing Node.js Microservices"]);

    // 7. Create a new project dynamically via UI actions
    await createProject(page, "New E2E Project", "tenant-1");

    // 8. Assert new project is added and selected
    await verifyProjectsList(page, [
      "Acme Corp Cloud Migration",
      "Fintech Core Ledger API",
      "New E2E Project",
    ]);
    await verifyActiveProjectName(page, "New E2E Project");

    // 9. Delete the active project
    if (process.env.MOCK_API !== "false") {
      // In mock mode, splice the in-memory array to simulate database deletion
      testProjects.pop();
    }
    await deleteActiveProject(page);

    // 10. Verify project has been cleanly removed from the list
    await verifyProjectsList(page, ["Acme Corp Cloud Migration", "Fintech Core Ledger API"]);
  });
});
