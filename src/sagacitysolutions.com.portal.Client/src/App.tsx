import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { login, logout, fetchApi } from "./api";
import "./App.css";

// ── TypeScript Definitions matching C# Domain ──
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

// ── Premium Demo Data (Fallback for a zero-setup WoW effect) ──
const DEMO_PROJECTS: Project[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    tenantId: "zzp1s6s0mqqc",
    name: "Acme Corp Cloud Migration",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    tenantId: "zzp1s6s0mqqc",
    name: "Fintech Core Ledger API",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    tenantId: "zzp1s6s0mqqc",
    name: "Logistics Dashboard & Analytics",
  },
];

const DEMO_TASKS: Record<string, WorkTask[]> = {
  "11111111-1111-1111-1111-111111111111": [
    {
      id: "t1",
      projectId: "11111111-1111-1111-1111-111111111111",
      title: "Set up AWS Landing Zone & IAM Roles",
      description: "Establish multi-account structure on AWS, configuring secure IAM roles and permission boundaries matching enterprise security standards.",
      type: "Research",
      status: "Completed",
      hours: 12,
      order: 1,
      attachments: [
        { id: "a1", taskId: "t1", url: "https://aws.amazon.com", name: "IAM Security Best Practices" }
      ],
      children: [
        { id: "sub1", projectId: "11111111-1111-1111-1111-111111111111", parentId: "t1", title: "Configure AWS Control Tower", type: "Development", status: "Completed", order: 1 }
      ]
    },
    {
      id: "t2",
      projectId: "11111111-1111-1111-1111-111111111111",
      title: "Dockerize existing Node.js Microservices",
      description: "Write custom multi-stage Dockerfiles for the backend gateway, notification-service and auth-service to optimize build speeds and image sizes.",
      type: "Development",
      status: "InProgress",
      hours: 18,
      order: 2,
      children: []
    },
    {
      id: "t3",
      projectId: "11111111-1111-1111-1111-111111111111",
      title: "Configure CI/CD Pipelines with GitHub Actions",
      description: "Automate build, lint, and deploy workflows using GitHub Actions. Secrets management to be securely resolved via OpenID Connect (OIDC).",
      type: "Development",
      status: "NotStarted",
      hours: 8,
      order: 3,
    },
    {
      id: "t4",
      projectId: "11111111-1111-1111-1111-111111111111",
      title: "Performance & Stress Testing on Sandbox",
      description: "Execute load testing using k6 script up to 5,000 requests/sec. Identify bottleneck in database connections pool sizing.",
      type: "Testing",
      status: "OnHold",
      hours: 16,
      order: 4,
    }
  ],
  "22222222-2222-2222-2222-222222222222": [
    {
      id: "t2-1",
      projectId: "22222222-2222-2222-2222-222222222222",
      title: "Double-Entry Ledger Schema Design",
      description: "Design highly-scalable SQL Server database schema for multi-asset transactions ensuring strict mathematical correctness and audit logs.",
      type: "Design",
      status: "Completed",
      hours: 24,
      order: 1,
    },
    {
      id: "t2-2",
      projectId: "22222222-2222-2222-2222-222222222222",
      title: "Implement Transaction Reconciliation Engine",
      description: "Core algorithm in .NET Core that reconciles external bank gateway statements against internal database records daily.",
      type: "Development",
      status: "InProgress",
      hours: 32,
      order: 2,
    }
  ],
  "33333333-3333-3333-3333-333333333333": [
    {
      id: "t3-1",
      projectId: "33333333-3333-3333-3333-333333333333",
      title: "UI Design of Real-time Fleet tracking Map",
      description: "Design high fidelity wireframes and user interaction flows for dynamic fleet locations tracking map dashboard, utilizing Mapbox.",
      type: "Design",
      status: "Completed",
      hours: 14,
      order: 1,
    }
  ]
};

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

  if (auth.status === "loading") {
    return (
      <div className="welcome-container">
        <div className="welcome-glass-card">
          <div className="welcome-logo">S</div>
          <h2>Sagacity Solutions</h2>
          <p>Initializing secure consulting session…</p>
        </div>
      </div>
    );
  }

  if (auth.status === "unauthenticated") {
    return (
      <div className="welcome-container">
        <div className="welcome-glass-card">
          <div className="welcome-logo">S</div>
          <h2>Sagacity Solutions</h2>
          <p>Welcome to the project portal. Please sign in to securely view your consulting projects, timeline, and deliverables.</p>
          <button type="button" className="btn-signin" onClick={login}>
            Secure Sign In
          </button>
        </div>
      </div>
    );
  }

  const { user } = auth;

  // Filter Tasks by search and type selector
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = taskTypeFilter === "All" || task.type === taskTypeFilter;
    return matchesSearch && matchesType;
  });

  // Group tasks by status for columns
  const getTasksByStatus = (status: WorkTaskStatus) => {
    return filteredTasks.filter(t => t.status === status);
  };

  // Humanize Status titles
  const getStatusLabel = (status: WorkTaskStatus) => {
    switch (status) {
      case "NotStarted": return "To Do";
      case "InProgress": return "In Progress";
      case "Completed": return "Completed";
      case "OnHold": return "On Hold";
      default: return status;
    }
  };

  return (
    <div className="portal-container">
      {/* ── Modern Header ── */}
      <header className="portal-header">
        <div className="brand-section">
          <div className="logo-icon">S</div>
          <div className="brand-info">
            <h1>Sagacity Solutions</h1>
            <p>Consulting Portal</p>
          </div>
        </div>

        <div className="user-profile-section">
          {Object.keys(user.organizations).map(orgId => (
            <div className="org-indicator" key={orgId}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {user.organizations[orgId]}
            </div>
          ))}
          <div className="user-badge">
            <span className="user-name">{user.username}</span>
            <div className="user-avatar">
              {user.username.substring(0, 2).toUpperCase()}
            </div>
          </div>
          <button type="button" className="btn-signout" onClick={logout}>
            Sign Out
          </button>
        </div>
      </header>

      {/* ── Main Workspace ── */}
      <main className="portal-workspace">
        {/* Left Side: Projects Selection */}
        <section className="projects-panel">
          <h2 className="panel-title">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Active Projects
          </h2>
          
          <div className="projects-list">
            {projects.map((project) => {
              const isGranted = user.portal_project_ids.length === 0 || user.portal_project_ids.includes(project.id);
              return (
                <button
                  key={project.id}
                  className={`project-card ${activeProject?.id === project.id ? "active" : ""}`}
                  onClick={() => setActiveProject(project)}
                  style={{ opacity: isGranted ? 1 : 0.6 }}
                >
                  <span className="project-name">{project.name}</span>
                  <div className="project-meta">
                    <span className="project-badge">Active</span>
                    <span style={{ fontSize: '0.65rem' }}>{project.id.substring(0, 8)}...</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Right Side: Tasks & Boards */}
        <section className="tasks-panel">
          <div className="tasks-header">
            <div className="active-project-info">
              <h2>{activeProject ? activeProject.name : "Select a Project"}</h2>
              <p>Consulting Deliverables & Tasks Overview</p>
            </div>
            
            {/* Search and Filters */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(170, 59, 255, 0.15)',
                  padding: '0.55rem 1rem',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '0.82rem',
                  width: '200px',
                  outline: 'none',
                  transition: 'var(--transition-fast)'
                }}
                className="search-input"
              />
              
              <select
                value={taskTypeFilter}
                onChange={(e) => setTaskTypeFilter(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(170, 59, 255, 0.15)',
                  padding: '0.55rem 1rem',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '0.82rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="All">All Types</option>
                <option value="Development">Development</option>
                <option value="Design">Design</option>
                <option value="Testing">Testing</option>
                <option value="Research">Research</option>
                <option value="Documentation">Documentation</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">
              <h3>Loading deliverables...</h3>
            </div>
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              <h3>No tasks found</h3>
              <p>This project currently has no registered consulting tasks.</p>
            </div>
          ) : (
            <div className="tasks-columns">
              {(["NotStarted", "InProgress", "Completed", "OnHold"] as WorkTaskStatus[]).map((status) => {
                const columnTasks = getTasksByStatus(status);
                return (
                  <div className="tasks-column" key={status}>
                    <div className="column-header">
                      <span className="column-title">
                        {getStatusLabel(status)}
                      </span>
                      <span className="task-count">{columnTasks.length}</span>
                    </div>

                    <div className="tasks-list-container">
                      {columnTasks.map((task) => (
                        <div
                          key={task.id}
                          className="task-card"
                          onClick={() => setActiveTask(task)}
                        >
                          <span className={`task-type-badge type-${task.type.toLowerCase()}`}>
                            {task.type}
                          </span>
                          <h3 className="task-title">{task.title}</h3>
                          
                          <div className="task-card-footer">
                            <div className="task-hours">
                              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {task.hours ? `${task.hours} hrs` : "N/A"}
                            </div>
                            {task.children && task.children.length > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                {task.children.length}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ── Task Details Modal ── */}
      {activeTask && (
        <div className="modal-overlay" onClick={() => setActiveTask(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Task Specification</h3>
              <button type="button" className="btn-close" onClick={() => setActiveTask(null)}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="details-title-section">
                <div className="details-type-row">
                  <span className={`task-type-badge type-${activeTask.type.toLowerCase()}`}>
                    {activeTask.type}
                  </span>
                  <span className={`status-pill status-${activeTask.status.toLowerCase().replace("notstarted", "not-started").replace("inprogress", "in-progress")}`}>
                    {getStatusLabel(activeTask.status)}
                  </span>
                </div>
                <h2 className="details-title">{activeTask.title}</h2>
              </div>

              <div className="details-meta-grid">
                <div className="meta-item">
                  <span className="meta-label">Logged Hours</span>
                  <span className="meta-value">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {activeTask.hours ? `${activeTask.hours} hours` : "None recorded"}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Task Index Order</span>
                  <span className="meta-value">#{activeTask.order}</span>
                </div>
              </div>

              <div className="details-description">
                <span className="meta-label">Detailed Scope Description</span>
                {activeTask.description ? (
                  <p className="description-text">{activeTask.description}</p>
                ) : (
                  <p className="description-text no-description">No detailed description has been provided for this task.</p>
                )}
              </div>

              {/* Subtasks (Children) */}
              {activeTask.children && activeTask.children.length > 0 && (
                <div className="subtasks-section">
                  <span className="meta-label">Sub-Tasks / Checklist</span>
                  <div className="subtasks-list">
                    {activeTask.children.map((subtask) => (
                      <div className="subtask-item" key={subtask.id}>
                        <span className="subtask-title">{subtask.title}</span>
                        <span className={`status-pill status-${subtask.status.toLowerCase().replace("notstarted", "not-started").replace("inprogress", "in-progress")}`}>
                          {getStatusLabel(subtask.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {activeTask.attachments && activeTask.attachments.length > 0 && (
                <div className="attachments-section">
                  <span className="meta-label">Reference Attachments</span>
                  <div className="attachments-grid">
                    {activeTask.attachments.map((file) => (
                      <a href={file.url} target="_blank" rel="noreferrer" className="attachment-card" key={file.id}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <span className="attachment-name">{file.name || "Resource Link"}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
