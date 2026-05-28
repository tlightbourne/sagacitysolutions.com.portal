import type { Project } from "../types";

interface ProjectsPanelProps {
  projects: Project[];
  activeProjectId?: string;
  portalProjectIds: string[];
  onSelectProject: (project: Project) => void;
}

export function ProjectsPanel({
  projects,
  activeProjectId,
  portalProjectIds,
  onSelectProject,
}: ProjectsPanelProps) {
  return (
    <section className="projects-panel">
      <h2 className="panel-title">
        <svg
          width="18"
          height="18"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
        Active Projects
      </h2>

      <div className="projects-list">
        {projects.map((project) => {
          // If wildcard '*' is present user has access to all projects
          const isGranted =
            portalProjectIds.includes("*") ||
            portalProjectIds.includes(project.id);

          return (
            <button
              key={project.id}
              className={`project-card ${activeProjectId === project.id ? "active" : ""
                }`}
              onClick={() => onSelectProject(project)}
              style={{ opacity: isGranted ? 1 : 0.6 }}
            >
              <span className="project-name">{project.name}</span>
              <div className="project-meta">
                <span className="project-badge">Active</span>
                <span style={{ fontSize: "0.65rem" }}>
                  {project.id.substring(0, 8)}...
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
