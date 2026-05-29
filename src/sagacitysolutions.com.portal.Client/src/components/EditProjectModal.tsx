import { useState } from "react";
import type { Project, ProjectStatus } from "../types";
import { CloseIcon } from "./Icons";

interface EditProjectModalProps {
  project: Project;
  onClose: () => void;
  onEditProject: (projectId: string, name: string, status: ProjectStatus) => Promise<void>;
}

export function EditProjectModal({
  project,
  onClose,
  onEditProject,
}: EditProjectModalProps) {
  const [editProjectName, setEditProjectName] = useState(project.name);
  const [editProjectStatus, setEditProjectStatus] = useState<ProjectStatus>(project.status);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProjectName.trim()) {
      setEditError("Project name is required.");
      return;
    }

    setEditSubmitting(true);
    setEditError("");
    try {
      await onEditProject(project.id, editProjectName.trim(), editProjectStatus);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update project.";
      setEditError(message);
    } finally {
      setEditSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Project Details</h3>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>
        <form
          onSubmit={handleEditSubmit}
          className="modal-body modal-form"
        >
          <div className="modal-input-group">
            <span className="meta-label">Project Name</span>
            <input
              type="text"
              required
              value={editProjectName}
              onChange={(e) => setEditProjectName(e.target.value)}
              placeholder="e.g. Cloud Migration Phase 2"
              className="modal-input"
            />
          </div>

          <div className="modal-input-group">
            <span className="meta-label">Status</span>
            <select
              value={editProjectStatus}
              onChange={(e) => setEditProjectStatus(e.target.value as ProjectStatus)}
              className="modal-select"
            >
              <option value="Proposed">Proposed</option>
              <option value="Active">Active</option>
              <option value="OnHold">On Hold</option>
              <option value="Completed">Completed</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          {editError && (
            <p className="modal-error-message">
              {editError}
            </p>
          )}

          <button
            type="submit"
            disabled={editSubmitting}
            className="modal-submit-btn"
          >
            {editSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
