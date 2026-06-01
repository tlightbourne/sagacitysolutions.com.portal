import { describe, it, expect } from "vitest";
import {
  normalizeProject,
  normalizeAttachment,
  normalizeTaskLink,
  normalizeTask,
} from "../normalize";

describe("normalizeProject", () => {
  it("should normalize raw project keys with camelCase and PascalCase support", () => {
    const rawPascal = { Id: "p1", TenantId: "t1", Name: "Project A", Status: "Active" };
    expect(normalizeProject(rawPascal)).toEqual({
      id: "p1",
      tenantId: "t1",
      name: "Project A",
      status: "Active",
      version: 0,
    });

    const rawCamel = { id: "p2", tenantId: "t2", name: "Project B", status: "Completed" };
    expect(normalizeProject(rawCamel)).toEqual({
      id: "p2",
      tenantId: "t2",
      name: "Project B",
      status: "Completed",
      version: 0,
    });
  });

  it("should use active status by default when not provided", () => {
    const raw = { id: "p1", tenantId: "t1", name: "Project A" };
    expect(normalizeProject(raw).status).toBe("Active");
  });

  it("should throw error if project raw payload is empty or null", () => {
    expect(() => normalizeProject(null as any)).toThrow();
  });
});

describe("normalizeAttachment", () => {
  it("should normalize RawAttachment fields correctly", () => {
    const raw = { Id: "a1", TaskId: "t1", Url: "https://google.com", Name: "Google Link" };
    expect(normalizeAttachment(raw)).toEqual({
      id: "a1",
      taskId: "t1",
      url: "https://google.com",
      name: "Google Link",
    });
  });
});

describe("normalizeTaskLink", () => {
  it("should normalize RawTaskLink fields correctly", () => {
    const raw = { TaskId: "t1", LinkedTaskId: "t2", LinkType: "Blocks" };
    expect(normalizeTaskLink(raw)).toEqual({
      taskId: "t1",
      linkedTaskId: "t2",
      linkType: "Blocks",
    });
  });
});

describe("normalizeTask", () => {
  it("should normalize simple and recursively nested task items", () => {
    const rawTask = {
      Id: "task-1",
      ProjectId: "proj-1",
      Title: "Task Title",
      Description: "Description Text",
      Type: "Development",
      Status: "InProgress",
      Hours: 5,
      Order: 2,
      CompletedAt: "2026-05-29T12:00:00Z",
      Children: [
        {
          Id: "subtask-1",
          ProjectId: "proj-1",
          Title: "Subtask Title",
          Type: "Testing",
          Status: "NotStarted",
          Order: 1,
        },
      ],
      Attachments: [
        {
          id: "att-1",
          taskId: "task-1",
          url: "https://sagacity.com",
          name: "Doc",
        },
      ],
    };

    const result = normalizeTask(rawTask);

    expect(result.id).toBe("task-1");
    expect(result.hours).toBe(5);
    expect(result.order).toBe(2);
    expect(result.children).toBeDefined();
    expect(result.children![0].id).toBe("subtask-1");
    expect(result.children![0].type).toBe("Testing");
    expect(result.attachments).toBeDefined();
    expect(result.attachments![0].id).toBe("att-1");
  });
});
