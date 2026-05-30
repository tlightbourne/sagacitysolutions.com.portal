import { Page, expect } from "@playwright/test";

export async function createProject(page: Page, name: string, tenantIdOrIndex: string | number = 0) {
  const addProjectBtn = page.locator(".projects-panel .btn-add-project");
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
  const column = page.locator(".tasks-column:not(.deliverables-column)", { hasText: columnTitle });
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

export async function editProject(
  page: Page,
  projectName: string,
  newProjectName: string,
  newStatus?: string
) {
  // Find project card by name and click edit button inside it
  const projectCard = page.locator(".project-card", { hasText: projectName });
  await expect(projectCard).toBeVisible();

  const editBtn = projectCard.locator(".btn-edit-project");
  await expect(editBtn).toBeVisible();
  await editBtn.click();

  const modal = page.locator(".modal-overlay");
  await expect(modal).toBeVisible();

  // Fill in the new name
  const nameInput = modal.locator("input[type='text']");
  await expect(nameInput).toBeVisible();
  await nameInput.fill(newProjectName);

  // If status is provided, select it
  if (newStatus) {
    const statusSelect = modal.locator("select");
    await expect(statusSelect).toBeVisible();
    await statusSelect.selectOption({ value: newStatus });
  }

  // Click submit
  const submitBtn = modal.locator("button[type='submit']");
  await expect(submitBtn).toBeVisible();
  await submitBtn.click();

  // Modal should close
  await expect(modal).not.toBeVisible();
}

export async function addDeliverable(page: Page, title: string, type: string = "Development") {
  const emptyStateAddBtn = page.locator(".empty-state .btn-add-project");
  if (await emptyStateAddBtn.isVisible()) {
    await emptyStateAddBtn.click();
  } else {
    const deliverableCol = page.locator(".deliverables-column");
    await expect(deliverableCol).toBeVisible();

    const addBtn = deliverableCol.locator(".btn-add-project");
    await expect(addBtn).toBeVisible();
    await addBtn.click();
  }

  const modal = page.locator(".modal-overlay");
  await expect(modal).toBeVisible();

  const titleInput = modal.locator("input[type='text']");
  await expect(titleInput).toBeVisible();
  await titleInput.fill(title);

  const typeSelect = modal.locator("select");
  await expect(typeSelect).toBeVisible();
  await typeSelect.selectOption({ value: type });

  const submitBtn = modal.locator("button[type='submit']");
  await expect(submitBtn).toBeVisible();
  await submitBtn.click();

  const errorMsg = modal.locator(".modal-error-message");
  await Promise.any([
    page.waitForSelector(".modal-overlay", { state: "detached", timeout: 10000 }),
    page.waitForSelector(".modal-error-message", { state: "visible", timeout: 10000 })
  ]).catch(() => {});

  if (await errorMsg.isVisible()) {
    const errorText = await errorMsg.innerText();
    console.error("❌ E2E DELIVERABLE CREATION FAILED. ERROR IS:", errorText);
  }

  await expect(modal).not.toBeVisible();
}

export async function addSubtask(page: Page, parentTitle: string, title: string, type: string = "Development") {
  const parentNode = page.locator(".tree-task-row", { hasText: parentTitle });
  await expect(parentNode).toBeVisible();
  await parentNode.hover();

  const addSubtaskBtn = parentNode.locator("button[title='Add Subtask']");
  await expect(addSubtaskBtn).toBeVisible();
  await addSubtaskBtn.click();

  const modal = page.locator(".modal-overlay");
  await expect(modal).toBeVisible();

  const titleInput = modal.locator("input[type='text']");
  await expect(titleInput).toBeVisible();
  await titleInput.fill(title);

  const typeSelect = modal.locator("select");
  await expect(typeSelect).toBeVisible();
  await typeSelect.selectOption({ value: type });

  const submitBtn = modal.locator("button[type='submit']");
  await expect(submitBtn).toBeVisible();
  await submitBtn.click();

  const errorMsg = modal.locator(".modal-error-message");
  await Promise.any([
    page.waitForSelector(".modal-overlay", { state: "detached", timeout: 10000 }),
    page.waitForSelector(".modal-error-message", { state: "visible", timeout: 10000 })
  ]).catch(() => {});

  if (await errorMsg.isVisible()) {
    const errorText = await errorMsg.innerText();
    console.error("❌ E2E SUBTASK CREATION FAILED. ERROR IS:", errorText);
  }

  await expect(modal).not.toBeVisible();
}

export async function editTaskStatus(page: Page, taskTitle: string, newStatus: string) {
  const taskCard = page.locator(".task-card", { hasText: taskTitle });
  await expect(taskCard).toBeVisible();
  await taskCard.click();

  const modal = page.locator(".modal-overlay");
  await expect(modal).toBeVisible();

  const statusSelect = modal.locator(".modal-input-group", { hasText: "Status" }).locator("select");
  await expect(statusSelect).toBeVisible();
  await statusSelect.selectOption({ value: newStatus });

  const submitBtn = modal.locator("button[type='submit']");
  await expect(submitBtn).toBeVisible();
  await submitBtn.click();

  const errorMsg = modal.locator(".modal-error-message");
  await Promise.any([
    page.waitForSelector(".modal-overlay", { state: "detached", timeout: 10000 }),
    page.waitForSelector(".modal-error-message", { state: "visible", timeout: 10000 })
  ]).catch(() => {});

  if (await errorMsg.isVisible()) {
    const errorText = await errorMsg.innerText();
    console.error("❌ E2E EDIT TASK STATUS FAILED. ERROR IS:", errorText);
  }

  await expect(modal).not.toBeVisible();
}

export async function deleteTask(page: Page, title: string) {
  const taskRow = page.locator(".tree-task-row", { hasText: title });
  if (await taskRow.isVisible()) {
    await taskRow.hover();
    const editBtn = taskRow.locator("button[title='View/Edit Details']");
    await expect(editBtn).toBeVisible();

    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Are you sure you want to delete");
      await dialog.accept();
    });

    await editBtn.click();

    const deleteBtn = page.locator(".modal-overlay button.btn-danger-new");
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    await expect(page.locator(".modal-overlay")).not.toBeVisible();
  }
}
