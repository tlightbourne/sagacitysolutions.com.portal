import { Page } from "@playwright/test";

export async function clearAllProjects(page: Page) {
  return await page.evaluate(async () => {
    // Fetch all projects
    const getRes = await fetch('/api/projects');
    if (!getRes.ok) return;
    const projects = await getRes.json();
    
    // Delete each project
    for (const p of projects) {
      await fetch(`/api/projects/${p.id}`, { method: 'DELETE' });
    }
  });
}

export async function seedProject(page: Page, name: string) {
  return await page.evaluate(async (projectName) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: projectName, tenantId: "tenant-1" })
    });
    return res.json();
  }, name);
}

export async function seedTask(
  page: Page,
  projectId: string,
  title: string,
  type: string = "Development",
  status: string = "NotStarted",
  parentId: string | null = null
) {
  return await page.evaluate(async (taskArgs) => {
    const res = await fetch(`/api/projects/${taskArgs.projectId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskArgs)
    });
    return res.json();
  }, { projectId, title, type, status, parentId });
}
