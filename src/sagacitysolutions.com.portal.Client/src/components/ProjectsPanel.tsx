import { useState, useEffect } from "react";
import type { Project } from "../types";

interface ProjectsPanelProps {
  projects: Project[];
  activeProjectId?: string;
  portalProjectIds: string[];
  onSelectProject: (project: Project) => void;
  organizations: Record<string, string>;
  scope?: string;
  onAddProject: (tenantId: string, name: string) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
}

export function ProjectsPanel({
  projects,
  activeProjectId,
  portalProjectIds,
  onSelectProject,
  organizations,
  scope,
  onAddProject,
  onDeleteProject,
}: ProjectsPanelProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Keep selectedTenantId updated when organizations load
  useEffect(() => {
    const tenantIds = Object.keys(organizations);
    if (tenantIds.length > 0 && !selectedTenantId) {
      setSelectedTenantId(tenantIds[0]);
    }
  }, [organizations, selectedTenantId]);

  const scopes = scope?.split(" ") || [];
  const canAddProject =
    scopes.includes("write:projects") && Object.keys(organizations).length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      setError("Project name is required.");
      return;
    }
    if (!selectedTenantId) {
      setError("Please select an organization.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await onAddProject(selectedTenantId, newProjectName.trim());
      setIsModalOpen(false);
      setNewProjectName("");
    } catch (err: any) {
      setError(err.message || "Failed to create project.");
    } finally {
      setSubmitting(false);
    }
  };

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

          const hasWriteScope = scopes.includes("write:projects");
          const canDelete = hasWriteScope && isGranted;

          return (
            <div
              key={project.id}
              role="button"
              tabIndex={0}
              className={`project-card ${
                activeProjectId === project.id ? "active" : ""
              }`}
              onClick={() => onSelectProject(project)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  onSelectProject(project);
                }
              }}
              style={{ opacity: isGranted ? 1 : 0.6 }}
            >
              <span className="project-name" style={{ paddingRight: canDelete ? "24px" : "0px" }}>
                {project.name}
              </span>
              <div className="project-meta">
                <span className={`project-badge status-${project.status.toLowerCase()}`}>
                  {project.status}
                </span>
                <span className="project-id-mini">
                  {(project.id || "").substring(0, 8)}...
                </span>
              </div>

              {canDelete && (
                <button
                  type="button"
                  className="btn-delete-project"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (confirm(`Are you sure you want to delete the project "${project.name}"?`)) {
                      try {
                        await onDeleteProject(project.id);
                      } catch (err: any) {
                        alert(err.message || "Failed to delete project.");
                      }
                    }
                  }}
                  title="Delete Project"
                >
                  <svg
                    width="14"
                    height="14"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {canAddProject && (
        <button
          type="button"
          className="btn-add-project"
          onClick={() => setIsModalOpen(true)}
        >
          <svg
            width="14"
            height="14"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Project
        </button>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Project</h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => setIsModalOpen(false)}
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <form
              onSubmit={handleSubmit}
              className="modal-body modal-form"
            >
              <div className="modal-input-group">
                <span className="meta-label">Project Name</span>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Cloud Migration Phase 2"
                  className="modal-input"
                />
              </div>

              <div className="modal-input-group">
                <span className="meta-label">Organization (Tenant)</span>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="modal-select"
                >
                  {Object.keys(organizations).map((id) => (
                    <option
                      key={id}
                      value={id}
                    >
                      {organizations[id]}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <p className="modal-error-message">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="modal-submit-btn"
              >
                {submitting ? "Creating..." : "Create Project"}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
