import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { login, logout, fetchApi } from "./api";
import "./App.css";

import type { Project, WorkTask, WorkTaskStatus } from "./types";
import { DEMO_PROJECTS, DEMO_TASKS } from "./demoData";
import { WelcomeView } from "./components/WelcomeView";
import { Header } from "./components/Header";
import { ProjectsPanel } from "./components/ProjectsPanel";
import { TasksPanel } from "./components/TasksPanel";
import { TaskDetailsModal } from "./components/TaskDetailsModal";

function App() {
  const auth = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [activeTask, setActiveTask] = useState<WorkTask | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>("All");

  const [loading, setLoading] = useState(false);

  // Fetch Projects once authenticated
  useEffect(() => {
    if (auth.status !== "authenticated") return;

    async function loadProjects() {
      setLoading(true);
      try {
        const data = await fetchApi("projects");
        if (data && Array.isArray(data) && data.length > 0) {
          setProjects(data);
          setActiveProject(data[0]);
        } else {
          // No projects in DB or API empty -> Fallback to gorgeous demo data
          setProjects(DEMO_PROJECTS);
          setActiveProject(DEMO_PROJECTS[0]);
        }
      } catch (err) {
        console.error("Error loading projects, using demo data:", err);
        setProjects(DEMO_PROJECTS);
        setActiveProject(DEMO_PROJECTS[0]);
      } finally {
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
      try {
        const data = await fetchApi(`projects/${currentProject.id}/tasks`);
        if (data && Array.isArray(data) && data.length > 0) {
          setTasks(data);
        } else {
          // No tasks found or endpoint failed -> Use beautiful mock tasks for that project
          setTasks(DEMO_TASKS[currentProject.id] || []);
        }
      } catch (err) {
        console.error(`Error loading tasks for ${currentProject.name}:`, err);
        setTasks(DEMO_TASKS[currentProject.id] || []);
      }
    }

    loadTasks();
  }, [activeProject]);

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
        {/* Left Side: Projects Selection */}
        <ProjectsPanel
          projects={projects}
          activeProjectId={activeProject?.id}
          portalProjectIds={user.portal_project_ids}
          onSelectProject={setActiveProject}
        />

        {/* Right Side: Tasks & Boards */}
        <TasksPanel
          projectName={activeProject ? activeProject.name : "Select a Project"}
          tasks={tasks}
          loading={loading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          taskTypeFilter={taskTypeFilter}
          setTaskTypeFilter={setTaskTypeFilter}
          onSelectTask={setActiveTask}
          statusLabelHelper={getStatusLabel}
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
