import { Page } from "@playwright/test";
import { MockDatabase } from "./helpers/mockDatabase";

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
 * Applies all mock routes for projects and tasks, wiring them to the provided MockDatabase instance.
 */
export async function applyMockRoutes(page: Page, db: MockDatabase) {
  if (process.env.MOCK_API === "false") return;

  // Projects GET and POST
  await page.route("**/api/projects", async (route, request) => {
    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        json: db.getProjects(),
      });
    } else if (request.method() === "POST") {
      const body = JSON.parse(request.postData() || "{}");
      const project = db.createProject(body);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        json: project,
      });
    } else {
      await route.fallback();
    }
  });

  // Projects PUT and DELETE by ID
  await page.route("**/api/projects/*", async (route, request) => {
    if (request.method() === "PUT") {
      const body = JSON.parse(request.postData() || "{}");
      const project = db.updateProject(body);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        json: project,
      });
    } else if (request.method() === "DELETE") {
      const urlParts = request.url().split('/');
      const projectId = urlParts[urlParts.length - 1];
      db.deleteProject(projectId);
      await route.fulfill({ status: 204 });
    } else {
      await route.fallback();
    }
  });

  // Tasks GET and POST
  await page.route("**/api/projects/*/tasks", async (route, request) => {
    const urlParts = request.url().split('/');
    const projectId = urlParts[urlParts.length - 2]; // e.g. /projects/:projectId/tasks

    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        json: db.getTasks(projectId),
      });
    } else if (request.method() === "POST") {
      const body = JSON.parse(request.postData() || "{}");
      const task = db.createTask(projectId, body);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        json: task,
      });
    } else {
      await route.fallback();
    }
  });

  // Tasks PUT and DELETE by ID
  await page.route("**/api/projects/*/tasks/*", async (route, request) => {
    if (request.method() === "PUT") {
      const body = JSON.parse(request.postData() || "{}");
      const task = db.updateTask(body);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        json: task,
      });
    } else if (request.method() === "DELETE") {
      const urlParts = request.url().split('/');
      const taskId = urlParts[urlParts.length - 1];
      db.deleteTask(taskId);
      await route.fulfill({ status: 204 });
    } else {
      await route.fallback();
    }
  });
}
