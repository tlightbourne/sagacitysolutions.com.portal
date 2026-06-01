import { MockProject, MockTask } from "../mockRoutes";

export class MockDatabase {
  public projects: MockProject[] = [];
  public tasks: any[] = [];

  constructor() {
    this.reset();
  }

  public reset() {
    this.projects = [];
    this.tasks = [];
  }

  public getProjects() {
    return this.projects;
  }

  public createProject(body: any): MockProject {
    const newProj = {
      id: body.id || `p-${Math.random().toString(36).substring(2, 9)}`,
      tenantId: body.tenantId || "tenant-1",
      name: body.name || "Newly Mocked Project",
      status: "Proposed",
    };
    this.projects.push(newProj);
    return newProj;
  }

  public updateProject(body: any): MockProject {
    const proj = this.projects.find((p) => p.id === body.projectId || p.id === body.id);
    if (proj) {
      proj.name = body.name || proj.name;
      proj.status = body.status || proj.status;
      return proj;
    }
    return {
      id: body.projectId || body.id || "11111111-1111-1111-1111-111111111111",
      tenantId: "tenant-1",
      name: body.name || "Updated Project Name",
      status: body.status || "Active",
    };
  }

  public deleteProject(projectId: string) {
    this.projects = this.projects.filter(p => p.id !== projectId);
  }

  public getTasks(projectId: string) {
    // Only return tasks for the specified project
    return this.tasks.filter(t => t.projectId === projectId);
  }

  public createTask(projectId: string, body: any): MockTask {
    const newTask = {
      id: body.id || `t-${Math.random().toString(36).substring(2, 9)}`,
      projectId: projectId,
      parentId: body.parentId || null,
      title: body.title,
      type: body.type || "Development",
      status: body.status || "NotStarted",
      hours: body.hours || 0,
      order: 1,
      children: []
    };

    if (body.parentId) {
      const findAndAdd = (list: any[]): boolean => {
        for (const t of list) {
          if (t.id === body.parentId) {
            t.children.push(newTask);
            return true;
          }
          if (t.children && findAndAdd(t.children)) {
            return true;
          }
        }
        return false;
      };
      findAndAdd(this.tasks);
    } else {
      this.tasks.push(newTask);
    }
    return newTask as MockTask;
  }

  public updateTask(body: any) {
    const findAndUpdate = (list: any[]): boolean => {
      for (const t of list) {
        if (t.id === body.id) {
          t.title = body.title || t.title;
          t.status = body.status || t.status;
          t.type = body.type || t.type;
          return true;
        }
        if (t.children && findAndUpdate(t.children)) {
          // Recalculate parent status dynamically
          const statuses = t.children.map((c: any) => c.status);
          if (statuses.every((s: string) => s === "Completed")) {
            t.status = "Completed";
          } else if (statuses.some((s: string) => s === "InProgress")) {
            t.status = "InProgress";
          } else if (statuses.some((s: string) => s === "Completed") && statuses.some((s: string) => s === "NotStarted")) {
            t.status = "InProgress";
          } else if (statuses.some((s: string) => s === "OnHold") && !statuses.some((s: string) => s === "InProgress") && !statuses.some((s: string) => s === "NotStarted")) {
            t.status = "OnHold";
          } else if (statuses.every((s: string) => s === "NotStarted")) {
            t.status = "NotStarted";
          } else {
            t.status = "InProgress";
          }
          return true;
        }
      }
      return false;
    };
    findAndUpdate(this.tasks);
    return body;
  }

  public deleteTask(taskId: string) {
    const findAndDelete = (list: any[]): boolean => {
      const index = list.findIndex(t => t.id === taskId);
      if (index !== -1) {
        list.splice(index, 1);
        return true;
      }
      for (const t of list) {
        if (t.children && findAndDelete(t.children)) {
          return true;
        }
      }
      return false;
    };
    findAndDelete(this.tasks);
  }
}
