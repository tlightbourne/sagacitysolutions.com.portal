import { Page, expect } from "@playwright/test";

export async function createProject(page: Page, name: string, tenantIdOrIndex: string | number = 0) {
  const addProjectBtn = page.locator(".btn-add-project");
  await expect(addProjectBtn).toBeVisible();
  await addProjectBtn.click();

  const modal = page.locator(".modal-overlay");
  await expect(modal).toBeVisible();

  await modal.locator("input[type='text']").fill(name);
  if (typeof tenantIdOrIndex === "number") {
    await modal.locator("select").selectOption({ index: tenantIdOrIndex });
  } else {
    await modal.locator("select").selectOption({ value: tenantIdOrIndex });
  }
  await modal.locator("button[type='submit']").click();

  await expect(modal).not.toBeVisible();
}

export async function deleteActiveProject(page: Page) {
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Are you sure you want to delete");
    await dialog.accept();
  });
  
  const activeProjectCard = page.locator(".project-card.active");
  const deleteBtn = activeProjectCard.locator(".btn-delete-project-new");
  await expect(deleteBtn).toBeVisible();
  await deleteBtn.click();
}

/**
 * Selects a project in the sidebar by index (0-based) or by name.
 */
export async function selectProject(page: Page, selector: number | string) {
  const sidebar = page.locator(".projects-panel");
  await expect(sidebar).toBeVisible();

  let targetCard;
  if (typeof selector === "number") {
    targetCard = sidebar.locator(".project-card").nth(selector);
  } else {
    targetCard = sidebar.locator(".project-card", { hasText: selector });
  }

  await expect(targetCard).toBeVisible();
  await targetCard.click();
}

/**
 * Asserts the list of projects displayed in the sidebar matches the expected names exactly.
 */
export async function verifyProjectsList(page: Page, expectedNames: string[]) {
  const sidebar = page.locator(".projects-panel");
  await expect(sidebar).toBeVisible();

  const projectCards = sidebar.locator(".project-card");
  await expect(projectCards).toHaveCount(expectedNames.length);

  for (let i = 0; i < expectedNames.length; i++) {
    await expect(projectCards.nth(i)).toContainText(expectedNames[i]);
  }
}

/**
 * Asserts that the currently selected project header displays the correct name.
 */
export async function verifyActiveProjectName(page: Page, expectedName: string) {
  const activeHeader = page.locator(".active-project-info h2");
  await expect(activeHeader).toBeVisible();
  await expect(activeHeader).toContainText(expectedName);
}

/**
 * Asserts that a task column contains the expected list of task titles.
 */
export async function verifyTasksInColumn(
  page: Page,
  columnTitle: string,
  expectedTaskTitles: string[]
) {
  const column = page.locator(".tasks-column", { hasText: columnTitle });
  await expect(column).toBeVisible();

  const taskCards = column.locator(".task-card");
  await expect(taskCards).toHaveCount(expectedTaskTitles.length);

  for (let i = 0; i < expectedTaskTitles.length; i++) {
    await expect(taskCards.nth(i)).toContainText(expectedTaskTitles[i]);
  }
}

/**
 * Asserts the authenticated user claims displayed in the header.
 */
export async function verifyUserSession(
  page: Page,
  username: string,
  organization: string
) {
  const userNameLoc = page.locator(".user-name");
  const orgIndicatorLoc = page.locator(".org-indicator");
  await expect(userNameLoc).toBeVisible();
  await expect(userNameLoc).toContainText(username);
  await expect(orgIndicatorLoc).toBeVisible();
  await expect(orgIndicatorLoc).toContainText(organization);
}
