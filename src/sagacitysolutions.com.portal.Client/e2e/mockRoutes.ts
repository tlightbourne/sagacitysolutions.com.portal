import { Page } from "@playwright/test";

export interface TestUserClaims {
  username: string;
  organizations: Record<string, string>;
  portal_project_ids: string[];
  scope: string;
}

export interface MockProject {
  id: string;
  tenantId: string;
  name: string;
  status: string;
}

export interface MockTask {
  id: string;
  projectId: string;
  title: string;
  type: string;
  status: string;
  hours: number;
  order: number;
}

/**
 * Mocks the BFF session state endpoint (/me).
 * If claims is null, returns a 401 Not Authenticated status.
 */
export async function mockMe(page: Page, claims: TestUserClaims | null) {
  if (process.env.MOCK_API === "false") return;
  await page.route("**/me", async (route) => {
    if (claims === null) {
      await route.fulfill({ status: 401 });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        json: claims,
      });
    }
  });
}

/**
 * Mocks the GET /api/projects endpoint to return a custom list of projects.
 */
export async function mockGetProjects(page: Page, projects: MockProject[]) {
  if (process.env.MOCK_API === "false") return;
  await page.route("**/api/projects", async (route, request) => {
    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        json: projects,
      });
    } else {
      await route.fallback();
    }
  });
}

/**
 * Mocks the POST /api/projects endpoint.
 * Takes a static response project or a dynamic callback that generates the project from request body.
 */
export async function mockCreateProject(
  page: Page,
  onCreate: MockProject | ((body: any) => MockProject)
) {
  if (process.env.MOCK_API === "false") return;
  await page.route("**/api/projects", async (route, request) => {
    if (request.method() === "POST") {
      const body = JSON.parse(request.postData() || "{}");
      const project = typeof onCreate === "function" ? onCreate(body) : onCreate;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        json: project,
      });
    } else {
      await route.fallback();
    }
  });
}

/**
 * Mocks the GET /api/projects/:projectId/tasks endpoint.
 */
export async function mockGetTasks(page: Page, projectId: string, tasks: MockTask[]) {
  if (process.env.MOCK_API === "false") return;
  await page.route(`**/api/projects/${projectId}/tasks`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: tasks,
    });
  });
}

/**
 * Mocks the POST /api/projects/:projectId/tasks endpoint.
 */
export async function mockCreateTask(
  page: Page,
  projectId: string,
  onCreate: MockTask | ((body: any) => MockTask)
) {
  if (process.env.MOCK_API === "false") return;
  await page.route(`**/api/projects/${projectId}/tasks`, async (route, request) => {
    if (request.method() === "POST") {
      const body = JSON.parse(request.postData() || "{}");
      const task = typeof onCreate === "function" ? onCreate(body) : onCreate;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        json: task,
      });
    } else {
      await route.fallback();
    }
  });
}

/**
 * Mocks the PUT /api/projects/:projectId/tasks/:taskId endpoint.
 */
export async function mockUpdateTask(
  page: Page,
  projectId: string,
  onUpdate?: (body: any) => MockTask
) {
  if (process.env.MOCK_API === "false") return;
  await page.route(`**/api/projects/${projectId}/tasks/*`, async (route, request) => {
    if (request.method() === "PUT") {
      const body = JSON.parse(request.postData() || "{}");
      const task = onUpdate
        ? onUpdate(body)
        : {
            id: body.id || "t1",
            projectId: projectId,
            parentId: body.parentId,
            title: body.title || "Updated Task Title",
            description: body.description,
            type: body.type || "Development",
            status: body.status || "NotStarted",
            hours: body.hours || 0,
            order: body.order || 1,
          };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        json: task,
      });
    } else {
      await route.fallback();
    }
  });
}

/**
 * Mocks the DELETE /api/projects/:projectId/tasks/:taskId endpoint.
 */
export async function mockDeleteTask(page: Page, projectId: string) {
  if (process.env.MOCK_API === "false") return;
  await page.route(`**/api/projects/${projectId}/tasks/*`, async (route, request) => {
    if (request.method() === "DELETE") {
      await route.fulfill({
        status: 204,
      });
    } else {
      await route.fallback();
    }
  });
}

/**
 * Mocks the PUT /api/projects/:projectId endpoint.
 */
export async function mockUpdateProject(
  page: Page,
  onUpdate?: (body: any) => MockProject
) {
  if (process.env.MOCK_API === "false") return;
  await page.route("**/api/projects/*", async (route, request) => {
    if (request.method() === "PUT") {
      const body = JSON.parse(request.postData() || "{}");
      const project = onUpdate
        ? onUpdate(body)
        : {
            id: body.projectId || "11111111-1111-1111-1111-111111111111",
            tenantId: "tenant-1",
            name: body.name || "Updated Project Name",
            status: body.status || "Active",
          };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        json: project,
      });
    } else {
      await route.fallback();
    }
  });
}

/**
 * Mocks the DELETE /api/projects/:projectId endpoint to return a 204 No Content.
 */
export async function mockDeleteProject(page: Page) {
  if (process.env.MOCK_API === "false") return;
  await page.route("**/api/projects/*", async (route, request) => {
    if (request.method() === "DELETE") {
      await route.fulfill({
        status: 204,
      });
    } else {
      await route.fallback();
    }
  });
}

/**
 * Backwards-compatible setup function that provisions a full default mock environment.
 */
export async function setupMockRoutes(page: Page) {
  if (process.env.MOCK_API === "false") return;

  const defaultUser: TestUserClaims = {
    username: "e2e_consultant",
    organizations: {
      "tenant-1": "Acme Corporation",
    },
    portal_project_ids: ["*"],
    scope: "read:projects write:projects",
  };

  const defaultProjects: MockProject[] = [
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

  const defaultTasks: MockTask[] = [
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

  await mockMe(page, defaultUser);
  await mockGetProjects(page, defaultProjects);
  await mockGetTasks(page, "11111111-1111-1111-1111-111111111111", defaultTasks);
  await mockDeleteProject(page);

  await mockCreateProject(page, (body) => ({
    id: "33333333-3333-3333-3333-333333333333",
    tenantId: body.tenantId || "tenant-1",
    name: body.name || "Newly Mocked Project",
    status: "Proposed",
  }));

  await mockUpdateProject(page);
}
