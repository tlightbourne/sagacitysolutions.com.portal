import { useState } from "react";
import type { Project, ProjectStatus } from "../types";
import { CreateProjectModal } from "./CreateProjectModal";
import { EditProjectModal } from "./EditProjectModal";

interface ProjectsPanelProps {
  projects: Project[];
  activeProjectId?: string;
  portalProjectIds: string[];
  onSelectProject: (project: Project) => void;
  organizations: Record<string, string>;
  scope?: string;
  onAddProject: (tenantId: string, name: string) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
  onEditProject: (projectId: string, name: string, status: ProjectStatus) => Promise<void>;
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
  onEditProject,
}: ProjectsPanelProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Clipboard feedback state
  const [copiedProjectId, setCopiedProjectId] = useState<string | null>(null);

  // Archive toggle state
  const [showArchived, setShowArchived] = useState(false);

  const handleCopyId = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
      setCopiedProjectId(id);
      setTimeout(() => setCopiedProjectId(null), 2000);
    } catch (err) {
      console.error("Failed to copy ID to clipboard:", err);
    }
  };

  const handleOpenEditModal = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setEditingProject(project);
    setIsEditModalOpen(true);
  };

  const scopes = scope?.split(" ") || [];
  const canAddProject =
    scopes.includes("write:projects") && Object.keys(organizations).length > 0;

  const visibleProjects = projects.filter((p) => showArchived || p.status !== "Archived");
  const archivedCount = projects.filter((p) => p.status === "Archived").length;

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

      {archivedCount > 0 && (
        <div className="projects-filter-toggle">
          <button
            type="button"
            className={`btn-toggle-archived ${showArchived ? "active" : ""}`}
            onClick={() => setShowArchived(!showArchived)}
          >
            <svg
              width="12"
              height="12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              {showArchived ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-2.228-2.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              )}
            </svg>
            {showArchived ? `Hide Archived (${archivedCount})` : `Show Archived (${archivedCount})`}
          </button>
        </div>
      )}

      <div className="projects-list">
        {visibleProjects.map((project) => {
          // If wildcard '*' is present user has access to all projects
          const isGranted =
            portalProjectIds.includes("*") ||
            portalProjectIds.includes(project.id);

          const hasWriteScope = scopes.includes("write:projects");
          const canDelete = hasWriteScope && isGranted;
          const canEdit = hasWriteScope && isGranted;

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
              <span className="project-name" style={{ paddingRight: canDelete || canEdit ? "52px" : "0px" }}>
                {project.name}
              </span>
              <div className="project-meta">
                <span className={`project-badge status-${project.status.toLowerCase()}`}>
                  {project.status}
                </span>
                <button
                  type="button"
                  className="project-id-copy-btn"
                  onClick={(e) => handleCopyId(e, project.id)}
                  title="Copy Full Project ID"
                >
                  <span className="project-id-text">
                    {copiedProjectId === project.id ? "Copied!" : `${(project.id || "").substring(0, 8)}...`}
                  </span>
                  <svg
                    width="10"
                    height="10"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="copy-icon"
                  >
                    {copiedProjectId === project.id ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                      />
                    )}
                  </svg>
                </button>
              </div>

              {(canEdit || canDelete) && (
                <div className="project-actions">
                  {canEdit && (
                    <button
                      type="button"
                      className="btn-edit-project"
                      onClick={(e) => handleOpenEditModal(e, project)}
                      title="Edit Project"
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
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      className="btn-delete-project-new"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete the project "${project.name}"?`)) {
                          try {
                            await onDeleteProject(project.id);
                          } catch (err) {
                            const message = err instanceof Error ? err.message : "Failed to delete project.";
                            alert(message);
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
        <CreateProjectModal
          onClose={() => setIsModalOpen(false)}
          organizations={organizations}
          onAddProject={onAddProject}
        />
      )}

      {isEditModalOpen && editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingProject(null);
          }}
          onEditProject={onEditProject}
        />
      )}
    </section>
  );
}
