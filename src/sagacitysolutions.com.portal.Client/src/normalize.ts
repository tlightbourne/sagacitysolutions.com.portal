import type {
  Project,
  WorkTask,
  Attachment,
  TaskLink,
  ProjectStatus,
  WorkTaskStatus,
  WorkTaskType,
} from "./types";

interface RawProject {
  id?: string;
  Id?: string;
  tenantId?: string;
  TenantId?: string;
  name?: string;
  Name?: string;
  status?: string;
  Status?: string;
  version?: number;
  Version?: number;
}

interface RawAttachment {
  id?: string;
  Id?: string;
  taskId?: string;
  TaskId?: string;
  url?: string;
  Url?: string;
  name?: string;
  Name?: string;
}

interface RawTaskLink {
  taskId?: string;
  TaskId?: string;
  linkedTaskId?: string;
  LinkedTaskId?: string;
  linkType?: string;
  LinkType?: string;
}

interface RawTask {
  id?: string;
  Id?: string;
  projectId?: string;
  ProjectId?: string;
  parentId?: string;
  ParentId?: string;
  title?: string;
  Title?: string;
  description?: string;
  Description?: string;
  type?: string;
  Type?: string;
  status?: string;
  Status?: string;
  hours?: number;
  Hours?: number;
  order?: number;
  Order?: number;
  completedAt?: string;
  CompletedAt?: string;
  children?: RawTask[];
  Children?: RawTask[];
  attachments?: RawAttachment[];
  Attachments?: RawAttachment[];
  taskLinks?: RawTaskLink[];
  TaskLinks?: RawTaskLink[];
  version?: number;
  Version?: number;
}

/**
 * Normalizes a raw project object by handling both camelCase and PascalCase keys.
 */
export function normalizeProject(p: RawProject): Project {
  if (!p) throw new Error("Cannot normalize null or undefined project");
  return {
    id: p.id ?? p.Id ?? "",
    tenantId: p.tenantId ?? p.TenantId ?? "",
    name: p.name ?? p.Name ?? "",
    status: (p.status ?? p.Status ?? "Active") as ProjectStatus,
    version: p.version ?? p.Version ?? 0,
  };
}

/**
 * Normalizes a raw attachment object by handling both camelCase and PascalCase keys.
 */
export function normalizeAttachment(a: RawAttachment): Attachment {
  if (!a) throw new Error("Cannot normalize null or undefined attachment");
  return {
    id: a.id ?? a.Id ?? "",
    taskId: a.taskId ?? a.TaskId ?? "",
    url: a.url ?? a.Url ?? "",
    name: a.name ?? a.Name,
  };
}

/**
 * Normalizes a raw task link object by handling both camelCase and PascalCase keys.
 */
export function normalizeTaskLink(l: RawTaskLink): TaskLink {
  if (!l) throw new Error("Cannot normalize null or undefined task link");
  return {
    taskId: l.taskId ?? l.TaskId ?? "",
    linkedTaskId: l.linkedTaskId ?? l.LinkedTaskId ?? "",
    linkType: l.linkType ?? l.LinkType ?? "",
  };
}

/**
 * Normalizes a raw task object (recursively mapping nested structures) by handling both camelCase and PascalCase keys.
 */
export function normalizeTask(t: RawTask): WorkTask {
  if (!t) throw new Error("Cannot normalize null or undefined task");
  return {
    id: t.id ?? t.Id ?? "",
    projectId: t.projectId ?? t.ProjectId ?? "",
    parentId: t.parentId ?? t.ParentId,
    title: t.title ?? t.Title ?? "",
    description: t.description ?? t.Description,
    type: (t.type ?? t.Type ?? "Development") as WorkTaskType,
    status: (t.status ?? t.Status ?? "NotStarted") as WorkTaskStatus,
    hours: t.hours ?? t.Hours,
    order: t.order ?? t.Order ?? 0,
    completedAt: t.completedAt ?? t.CompletedAt,
    children: Array.isArray(t.children ?? t.Children)
      ? (t.children ?? t.Children)!.map(normalizeTask)
      : undefined,
    attachments: Array.isArray(t.attachments ?? t.Attachments)
      ? (t.attachments ?? t.Attachments)!.map(normalizeAttachment)
      : undefined,
    taskLinks: Array.isArray(t.taskLinks ?? t.TaskLinks)
      ? (t.taskLinks ?? t.TaskLinks)!.map(normalizeTaskLink)
      : undefined,
    version: t.version ?? t.Version ?? 0,
  };
}
