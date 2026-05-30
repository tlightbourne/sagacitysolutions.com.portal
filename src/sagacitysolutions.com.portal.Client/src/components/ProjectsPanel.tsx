import { useState } from "react";
import type { Project, ProjectStatus } from "../types";
import { CreateProjectModal } from "./CreateProjectModal";
import { EditProjectModal } from "./EditProjectModal";
import {
  FolderIcon,
  EyeIcon,
  EyeOffIcon,
  CopyIcon,
  CheckIcon,
  EditIcon,
  TrashIcon,
  PlusIcon,
} from "./Icons";

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

  const visibleProjects = projects
    .filter((p) => showArchived || p.status !== "Archived")
    .sort((a, b) => a.name.localeCompare(b.name));
  const archivedCount = projects.filter((p) => p.status === "Archived").length;

  return (
    <section className="projects-panel">
      <h2 className="panel-title">
        <FolderIcon />
        Active Projects
      </h2>

      {archivedCount > 0 && (
        <div className="projects-filter-toggle">
          <button
            type="button"
            className={`btn-toggle-archived ${showArchived ? "active" : ""}`}
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? <EyeOffIcon /> : <EyeIcon />}
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
                  {copiedProjectId === project.id ? <CheckIcon /> : <CopyIcon />}
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
                      <EditIcon />
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
                      <TrashIcon />
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
          <PlusIcon />
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
