export type WorkTaskStatus = "NotStarted" | "InProgress" | "Completed" | "OnHold" | "Archived";
export type WorkTaskType = "Development" | "Testing" | "Documentation" | "Design" | "Research" | "ProofOfConcept" | "Triage";

export interface Attachment {
  id: string;
  taskId: string;
  url: string;
  name?: string;
}

export interface TaskLink {
  taskId: string;
  linkedTaskId: string;
  linkType: string;
}

export interface WorkTask {
  id: string;
  projectId: string;
  parentId?: string;
  title: string;
  description?: string;
  type: WorkTaskType;
  status: WorkTaskStatus;
  hours?: number;
  order: number;
  completedAt?: string;
  children?: WorkTask[];
  attachments?: Attachment[];
  taskLinks?: TaskLink[];
}

export interface Project {
  id: string;
  tenantId: string;
  name: string;
}
