import { Page } from "@playwright/test";

export async function setupMockRoutes(page: Page) {
  // 1. Mock BFF session state endpoint /me
  await page.route("**/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: {
        username: "e2e_consultant",
        organizations: {
          "tenant-1": "Acme Corporation",
        },
        portal_project_ids: ["*"],
        scope: "read:projects write:projects",
      },
    });
  });

  // 2. Mock GET Projects list
  await page.route("**/api/projects", async (route, request) => {
    if (request.method() === "POST") {
      // Mock project creation POST request
      const body = JSON.parse(request.postData() || "{}");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        json: {
          id: "33333333-3333-3333-3333-333333333333",
          tenantId: body.tenantId || "tenant-1",
          name: body.name || "Newly Mocked Project",
          status: "Proposed",
        },
      });
    } else {
      // Mock projects list GET request
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        json: [
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
        ],
      });
    }
  });

  // 3. Mock GET Tasks for Active Project
  await page.route(
    "**/api/projects/11111111-1111-1111-1111-111111111111/tasks",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        json: [
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
        ],
      });
    }
  );

  // 4. Mock PUT Project (Edit project name/status)
  await page.route("**/api/projects/*", async (route, request) => {
    if (request.method() === "DELETE") {
      await route.fulfill({
        status: 204, // 204 No Content
      });
    } else if (request.method() === "PUT") {
      const body = JSON.parse(request.postData() || "{}");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        json: {
          id: body.projectId || "11111111-1111-1111-1111-111111111111",
          tenantId: "tenant-1",
          name: body.name || "Updated Project Name",
          status: body.status || "Active",
        },
      });
    }
  });
}
