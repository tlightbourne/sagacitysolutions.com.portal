import { test, expect } from "@playwright/test";
import { authenticateSession, PREDEFINED_USERS } from "./helpers/auth";
import { mockMe, applyMockRoutes } from "./mockRoutes";
import { MockDatabase } from "./helpers/mockDatabase";
import {
  createProject,
  deleteActiveProject,
  selectProject,
  verifyProjectsList,
  verifyActiveProjectName,
  verifyTasksInColumn,
  verifyUserSession,
  editProject
} from "./helpers/project";

test.describe("Portal E2E - Projects", () => {
  let db: MockDatabase;
  const user = PREDEFINED_USERS.consultant;

  test.beforeEach(async ({ page }) => {
    db = new MockDatabase();
    await mockMe(page, user);
    await applyMockRoutes(page, db);
    await authenticateSession(page, user);
  });

  test("should list projects and load initial dashboard", async ({ page }) => {
    await verifyUserSession(page, user.username, "Acme Corporation");
    await verifyProjectsList(page, ["Acme Corp Cloud Migration", "Fintech Core Ledger API"]);
    await selectProject(page, 0);
    await verifyActiveProjectName(page, "Acme Corp Cloud Migration");
    await verifyTasksInColumn(page, "Completed", ["Set up AWS Landing Zone & IAM Roles"]);
    await verifyTasksInColumn(page, "In Progress", ["Dockerize existing Node.js Microservices"]);
  });

  test("should successfully create a new project", async ({ page }) => {
    await createProject(page, "New E2E Project", "tenant-1");
    await verifyProjectsList(page, [
      "Acme Corp Cloud Migration",
      "Fintech Core Ledger API",
      "New E2E Project",
    ]);
    await verifyActiveProjectName(page, "New E2E Project");
  });

  test("should delete an active project", async ({ page }) => {
    await selectProject(page, 0);
    await deleteActiveProject(page);
    await verifyProjectsList(page, ["Fintech Core Ledger API"]);
  });

  test("should successfully edit an existing project", async ({ page }) => {
    await selectProject(page, "Acme Corp Cloud Migration");
    await editProject(page, "Acme Corp Cloud Migration", "Acme Corp Cloud Migration v2", "OnHold");
    await verifyProjectsList(page, ["Acme Corp Cloud Migration v2", "Fintech Core Ledger API"]);
    await verifyActiveProjectName(page, "Acme Corp Cloud Migration v2");
  });
});
