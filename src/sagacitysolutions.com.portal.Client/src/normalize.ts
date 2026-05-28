import type { Project, WorkTask, Attachment, TaskLink } from "./types";

/**
 * Normalizes a raw project object by handling both camelCase and PascalCase keys.
 */
export function normalizeProject(p: any): Project {
  if (!p) throw new Error("Cannot normalize null or undefined project");
  return {
    id: p.id ?? p.Id,
    tenantId: p.tenantId ?? p.TenantId,
    name: p.name ?? p.Name,
  };
}

/**
 * Normalizes a raw attachment object by handling both camelCase and PascalCase keys.
 */
export function normalizeAttachment(a: any): Attachment {
  if (!a) throw new Error("Cannot normalize null or undefined attachment");
  return {
    id: a.id ?? a.Id,
    taskId: a.taskId ?? a.TaskId,
    url: a.url ?? a.Url,
    name: a.name ?? a.Name,
  };
}

/**
 * Normalizes a raw task link object by handling both camelCase and PascalCase keys.
 */
export function normalizeTaskLink(l: any): TaskLink {
  if (!l) throw new Error("Cannot normalize null or undefined task link");
  return {
    taskId: l.taskId ?? l.TaskId,
    linkedTaskId: l.linkedTaskId ?? l.LinkedTaskId,
    linkType: l.linkType ?? l.LinkType,
  };
}

/**
 * Normalizes a raw task object (recursively mapping nested structures) by handling both camelCase and PascalCase keys.
 */
export function normalizeTask(t: any): WorkTask {
  if (!t) throw new Error("Cannot normalize null or undefined task");
  return {
    id: t.id ?? t.Id,
    projectId: t.projectId ?? t.ProjectId,
    parentId: t.parentId ?? t.ParentId,
    title: t.title ?? t.Title,
    description: t.description ?? t.Description,
    type: t.type ?? t.Type,
    status: t.status ?? t.Status,
    hours: t.hours ?? t.Hours,
    order: t.order ?? t.Order,
    completedAt: t.completedAt ?? t.CompletedAt,
    children: Array.isArray(t.children ?? t.Children)
      ? (t.children ?? t.Children).map(normalizeTask)
      : undefined,
    attachments: Array.isArray(t.attachments ?? t.Attachments)
      ? (t.attachments ?? t.Attachments).map(normalizeAttachment)
      : undefined,
    taskLinks: Array.isArray(t.taskLinks ?? t.TaskLinks)
      ? (t.taskLinks ?? t.TaskLinks).map(normalizeTaskLink)
      : undefined,
  };
}
