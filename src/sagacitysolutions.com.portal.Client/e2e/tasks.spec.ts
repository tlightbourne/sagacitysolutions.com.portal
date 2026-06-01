import { test, expect } from "@playwright/test";
import { authenticateSession, PREDEFINED_USERS } from "./helpers/auth";
import { mockMe, applyMockRoutes } from "./mockRoutes";
import { MockDatabase } from "./helpers/mockDatabase";
import {
  selectProject,
  addDeliverable,
  addSubtask,
  editTaskStatus,
  deleteTask
} from "./helpers/project";

test.describe("Portal E2E - Tasks", () => {
  let db: MockDatabase;
  const user = PREDEFINED_USERS.consultant;

  test.beforeEach(async ({ page }) => {
    db = new MockDatabase();
    // Start with a clean slate for tasks on this project for the hierarchical test
    db.tasks = db.tasks.filter(t => t.projectId !== "11111111-1111-1111-1111-111111111111");

    await mockMe(page, user);
    await applyMockRoutes(page, db);
    await authenticateSession(page, user);
    
    // Select the first project automatically to start on the task board
    await selectProject(page, "Acme Corp Cloud Migration");
  });

  test("should support hierarchical task CRUD and status propagation", async ({ page }) => {
    // Add top-level deliverable
    await addDeliverable(page, "Database Sync Deliverable", "Development");

    const deliverableNode = page.locator(".tree-task-row", { hasText: "Database Sync Deliverable" });
    await expect(deliverableNode).toBeVisible();

    // Add subtask
    await addSubtask(page, "Database Sync Deliverable", "Migrate Postgres Schemas", "Testing");

    const subtaskNode = page.locator(".tree-task-row", { hasText: "Migrate Postgres Schemas" });
    await expect(subtaskNode).toBeVisible();

    // Verify only leaf subtask is rendered in the To Do Kanban column
    const parentKanbanCard = page.locator(".tasks-column:not(.deliverables-column)", { hasText: "To Do" }).locator(".task-card").locator(".task-title", { hasText: "Database Sync Deliverable" });
    await expect(parentKanbanCard).toHaveCount(0);

    const subtaskKanbanCard = page.locator(".tasks-column:not(.deliverables-column)", { hasText: "To Do" }).locator(".task-card", { hasText: "Migrate Postgres Schemas" });
    await expect(subtaskKanbanCard).toBeVisible();

    // Update the subtask status to InProgress
    await editTaskStatus(page, "Migrate Postgres Schemas", "InProgress");

    // Subtask should move to In Progress column
    const ipKanbanCard = page.locator(".tasks-column:not(.deliverables-column)", { hasText: "In Progress" }).locator(".task-card", { hasText: "Migrate Postgres Schemas" });
    await expect(ipKanbanCard).toBeVisible();

    // Verify the parent task status in the deliverables column has propagated to In Progress
    const parentStatusBadge = page.locator(".tree-task-row", { hasText: "Database Sync Deliverable" }).locator(".project-badge");
    await expect(parentStatusBadge).toContainText("In Progress");

    // Cleanup: Delete top-level deliverables
    await deleteTask(page, "Database Sync Deliverable");
  });
});
