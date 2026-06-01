import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { login, logout, fetchApi } from "./api";
import "./App.css";

import type { Project, WorkTask, WorkTaskStatus, WorkTaskType, ProjectStatus } from "./types";

import { WelcomeView } from "./components/WelcomeView";
import { Header } from "./components/Header";
import { TasksPanel } from "./components/TasksPanel";
import { TaskDetailsModal } from "./components/TaskDetailsModal";
import { normalizeProject, normalizeTask } from "./normalize";

function App() {
  const auth = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [activeTask, setActiveTask] = useState<WorkTask | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>("All");

  const [loading, setLoading] = useState(true);
  const [reloadTasksCount, setReloadTasksCount] = useState(0);
  const triggerReloadTasks = () => setReloadTasksCount((prev) => prev + 1);

  // Fetch Projects once authenticated
  useEffect(() => {
    if (auth.status !== "authenticated") return;

    async function loadProjects() {
      setLoading(true);
      try {
        const data = await fetchApi("projects");
        if (data && Array.isArray(data) && data.length > 0) {
          const normalized = data.map(normalizeProject);
          setProjects(normalized);
          setActiveProject((currentActive) => {
            if (currentActive) {
              const stillExists = normalized.find((p) => p.id === currentActive.id);
              if (stillExists) return stillExists;
            }
            return normalized[0];
          });
        } else {
          setProjects([]);
          setActiveProject(null);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading projects:", err);
        setProjects([]);
        setActiveProject(null);
        setLoading(false);
      }
    }

    loadProjects();
  }, [auth.status]);

  // Fetch Tasks when Active Project changes
  useEffect(() => {
    const currentProject = activeProject;
    if (!currentProject) return;

    async function loadTasks() {
      if (!currentProject) return;
      setLoading(true);
      try {
        const data = await fetchApi(`projects/${currentProject.id}/tasks`);
        if (data && Array.isArray(data) && data.length > 0) {
          const normalized = data.map(normalizeTask);
          setTasks(normalized);
        } else {
          setTasks([]);
        }
      } catch (err) {
        console.error(`Error loading tasks for ${currentProject.name}:`, err);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, [activeProject, reloadTasksCount]);

  if (auth.status === "loading" || auth.status === "unauthenticated") {
    return <WelcomeView status={auth.status} onLogin={login} />;
  }

  const { user } = auth;

  // Humanize Status titles
  const getStatusLabel = (status: WorkTaskStatus) => {
    switch (status) {
      case "NotStarted":
        return "To Do";
      case "InProgress":
        return "In Progress";
      case "Completed":
        return "Completed";
      case "OnHold":
        return "On Hold";
      default:
        return status;
    }
  };

  const handleAddProject = async (tenantId: string, name: string) => {
    const newProject = await fetchApi("projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tenantId, name }),
    });

    console.log("newProject:", newProject);

    if (newProject) {
      const normalizedProject = normalizeProject(newProject);
      setProjects((prev) => [...prev, normalizedProject]);
      setActiveProject(normalizedProject);
    } else {
      throw new Error("Failed to create project.");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await fetchApi(`projects/${projectId}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("Delete API failed, removing from local state:", err);
    }

    setProjects((prev) => {
      const remaining = prev.filter((p) => p.id !== projectId);
      if (activeProject?.id === projectId) {
        setActiveProject(remaining.length > 0 ? remaining[0] : null);
      }
      return remaining;
    });
  };

  const handleEditProject = async (projectId: string, name: string, status: ProjectStatus, version: number) => {
    const updatedProject = await fetchApi(`projects/${projectId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ projectId, name, status, version }),
    });

    if (updatedProject) {
      const normalized = normalizeProject(updatedProject);
      setProjects((prev) => prev.map((p) => p.id === projectId ? normalized : p));
      if (activeProject?.id === projectId) {
        setActiveProject(normalized);
      }
    } else {
      throw new Error("Failed to update project.");
    }
  };

  const handleAddTask = async (title: string, type: WorkTaskType, description?: string, hours?: number, parentId?: string) => {
    if (!activeProject) return;
    await fetchApi(`projects/${activeProject.id}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: activeProject.id, title, type, description, hours, parentId }),
    });
    triggerReloadTasks();
  };

  const handleEditTask = async (taskId: string, title: string, type: WorkTaskType, status: WorkTaskStatus, version: number, description?: string, hours?: number) => {
    if (!activeProject) return;
    await fetchApi(`projects/${activeProject.id}/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: activeProject.id, id: taskId, title, type, status, description, hours, version }),
    });
    triggerReloadTasks();
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!activeProject) return;
    await fetchApi(`projects/${activeProject.id}/tasks/${taskId}`, {
      method: "DELETE",
    });
    triggerReloadTasks();
  };

  const handleReorderTask = async (taskId: string, newStatus: WorkTaskStatus, newOrder: number, version: number) => {
    if (!activeProject) return;
    try {
      const data = await fetchApi(`projects/${activeProject.id}/tasks/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProject.id, taskId, newStatus, newOrder, version }),
      });
      if (data && Array.isArray(data)) {
        setTasks(data.map(normalizeTask));
      }
    } catch (err) {
      console.error("Failed to reorder tasks:", err);
      triggerReloadTasks();
    }
  };

  return (
    <div className="portal-container">
      {/* ── Modern Header ── */}
      <Header
        username={user.username}
        organizations={user.organizations}
        onLogout={logout}
      />

      {/* ── Main Workspace ── */}
      <main className="portal-workspace">
        <TasksPanel
          projectName={activeProject ? activeProject.name : "Select a Project"}
          projects={projects}
          activeProject={activeProject}
          portalProjectIds={user.portal_project_ids}
          onSelectProject={setActiveProject}
          onAddProject={handleAddProject}
          onDeleteProject={handleDeleteProject}
          onEditProject={handleEditProject}
          organizations={user.organizations}
          tasks={tasks}
          loading={loading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          taskTypeFilter={taskTypeFilter}
          setTaskTypeFilter={setTaskTypeFilter}
          onSelectTask={setActiveTask}
          statusLabelHelper={getStatusLabel}
          onAddTask={handleAddTask}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          onReorderTask={handleReorderTask}
          scope={user.scope}
        />
      </main>

      {/* ── Task Details Modal ── */}
      {activeTask && (
        <TaskDetailsModal
          task={activeTask}
          onClose={() => setActiveTask(null)}
          statusLabelHelper={getStatusLabel}
        />
      )}
    </div>
  );
}

export default App;
