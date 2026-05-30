import { test, expect } from "@playwright/test";
import { authenticateSession, PREDEFINED_USERS } from "./helpers/auth";
import {
  mockMe,
  mockGetProjects,
  mockCreateProject,
  mockGetTasks,
  mockDeleteProject,
  mockUpdateProject,
  mockCreateTask,
  mockUpdateTask,
  mockDeleteTask,
} from "./mockRoutes";
import {
  createProject,
  deleteActiveProject,
  selectProject,
  verifyProjectsList,
  verifyActiveProjectName,
  verifyTasksInColumn,
  verifyUserSession,
  editProject,
  addDeliverable,
  addSubtask,
  editTaskStatus,
  deleteTask,
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

  test("should successfully edit an existing project", async ({ page }) => {
    const user = PREDEFINED_USERS.consultant;

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

    await mockGetProjects(page, testProjects);
    await mockGetTasks(page, "11111111-1111-1111-1111-111111111111", []);
    
    // Support reactive mocked collection state changes for the PUT project endpoint
    await mockUpdateProject(page, (body) => {
      const proj = testProjects.find((p) => p.id === body.projectId);
      if (proj) {
        proj.name = body.name || proj.name;
        proj.status = body.status || proj.status;
      }
      return {
        id: body.projectId || "11111111-1111-1111-1111-111111111111",
        tenantId: "tenant-1",
        name: body.name || "Updated Project Name",
        status: body.status || "Active",
      };
    });

    await authenticateSession(page, user);

    // Verify initial state
    await verifyProjectsList(page, ["Acme Corp Cloud Migration", "Fintech Core Ledger API"]);

    // Select the project to make it active
    await selectProject(page, "Acme Corp Cloud Migration");

    // Edit project
    await editProject(page, "Acme Corp Cloud Migration", "Acme Corp Cloud Migration v2", "OnHold");

    // Verify name has updated in the list and active headers
    await verifyProjectsList(page, ["Acme Corp Cloud Migration v2", "Fintech Core Ledger API"]);
    await verifyActiveProjectName(page, "Acme Corp Cloud Migration v2");
  });

  test("should support hierarchical task CRUD and status propagation", async ({ page }) => {
    const user = PREDEFINED_USERS.consultant;
    const projectId = "11111111-1111-1111-1111-111111111111";

    const testProjects = [
      {
        id: projectId,
        tenantId: "tenant-1",
        name: "Acme Corp Cloud Migration",
        status: "Active",
      },
    ];

    const testTasks: any[] = [];

    await mockGetProjects(page, testProjects);
    await mockGetTasks(page, projectId, testTasks);

    // Mock task creation
    await mockCreateTask(page, projectId, (body) => {
      const newTask = {
        id: body.id || `t-${Math.random().toString(36).substring(2, 9)}`,
        projectId: body.projectId,
        parentId: body.parentId || null,
        title: body.title,
        type: body.type || "Development",
        status: "NotStarted",
        hours: body.hours || 0,
        order: 1,
        children: []
      };

      if (body.parentId) {
        const findAndAdd = (list: any[]): boolean => {
          for (const t of list) {
            if (t.id === body.parentId) {
              t.children.push(newTask);
              return true;
            }
            if (t.children && findAndAdd(t.children)) {
              return true;
            }
          }
          return false;
        };
        findAndAdd(testTasks);
      } else {
        testTasks.push(newTask);
      }
      return newTask;
    });

    // Mock task update with dynamic parent status propagation
    await mockUpdateTask(page, projectId, (body) => {
      const findAndUpdate = (list: any[]): boolean => {
        for (const t of list) {
          if (t.id === body.id) {
            t.title = body.title || t.title;
            t.status = body.status || t.status;
            t.type = body.type || t.type;
            return true;
          }
          if (t.children && findAndUpdate(t.children)) {
            // Recalculate parent status dynamically
            const statuses = t.children.map((c: any) => c.status);
            if (statuses.every((s: string) => s === "Completed")) {
              t.status = "Completed";
            } else if (statuses.some((s: string) => s === "InProgress")) {
              t.status = "InProgress";
            } else if (statuses.some((s: string) => s === "Completed") && statuses.some((s: string) => s === "NotStarted")) {
              t.status = "InProgress";
            } else if (statuses.some((s: string) => s === "OnHold") && !statuses.some((s: string) => s === "InProgress") && !statuses.some((s: string) => s === "NotStarted")) {
              t.status = "OnHold";
            } else if (statuses.every((s: string) => s === "NotStarted")) {
              t.status = "NotStarted";
            } else {
              t.status = "InProgress";
            }
            return true;
          }
        }
        return false;
      };
      findAndUpdate(testTasks);
      return body;
    });

    // Mock task deletion
    await mockDeleteTask(page, projectId);

    await authenticateSession(page, user);

    // 1. Select project
    await selectProject(page, "Acme Corp Cloud Migration");

    // 2. Add first deliverable "Cloud Integration Architecture" dynamically
    await addDeliverable(page, "Cloud Integration Architecture", "Research");

    // Verify top level task exists in the deliverables column
    const firstTaskNode = page.locator(".tree-task-row", { hasText: "Cloud Integration Architecture" });
    await expect(firstTaskNode).toBeVisible();

    // 3. Add a new top-level deliverable
    await addDeliverable(page, "Database Sync Deliverable", "Development");

    const secondTaskNode = page.locator(".tree-task-row", { hasText: "Database Sync Deliverable" });
    await expect(secondTaskNode).toBeVisible();

    // 4. Add a subtask under "Database Sync Deliverable"
    await addSubtask(page, "Database Sync Deliverable", "Migrate Postgres Schemas", "Testing");

    // The subtask should be visible in the deliverables column hierarchy
    const subtaskNode = page.locator(".tree-task-row", { hasText: "Migrate Postgres Schemas" });
    await expect(subtaskNode).toBeVisible();

    // 5. Verify only leaf subtask is rendered in the To Do (NotStarted) Kanban column
    // The parent task "Database Sync Deliverable" has children so it should NOT be in the Kanban boards
    const parentKanbanCard = page.locator(".tasks-column:not(.deliverables-column)", { hasText: "To Do" }).locator(".task-card").locator(".task-title", { hasText: "Database Sync Deliverable" });
    await expect(parentKanbanCard).toHaveCount(0);

    // The subtask "Migrate Postgres Schemas" is a leaf task and should be in To Do column
    const subtaskKanbanCard = page.locator(".tasks-column:not(.deliverables-column)", { hasText: "To Do" }).locator(".task-card", { hasText: "Migrate Postgres Schemas" });
    await expect(subtaskKanbanCard).toBeVisible();

    // 6. Update the subtask status to InProgress
    await editTaskStatus(page, "Migrate Postgres Schemas", "InProgress");

    // Subtask should move to In Progress column
    const ipKanbanCard = page.locator(".tasks-column:not(.deliverables-column)", { hasText: "In Progress" }).locator(".task-card", { hasText: "Migrate Postgres Schemas" });
    await expect(ipKanbanCard).toBeVisible();

    // 7. Verify the parent task status in the deliverables column has propagated to In Progress
    const parentStatusBadge = page.locator(".tree-task-row", { hasText: "Database Sync Deliverable" }).locator(".project-badge");
    await expect(parentStatusBadge).toContainText("In Progress");

    // 8. Cleanup: Delete top-level deliverables recursively to leave the database clean
    for (const title of ["Database Sync Deliverable", "Cloud Integration Architecture"]) {
      await deleteTask(page, title);
    }
  });
});
