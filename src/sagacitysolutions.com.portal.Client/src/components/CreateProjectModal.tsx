import { useState } from "react";
import { CloseIcon } from "./Icons";

interface CreateProjectModalProps {
  onClose: () => void;
  organizations: Record<string, string>;
  onAddProject: (tenantId: string, name: string) => Promise<void>;
}

export function CreateProjectModal({
  onClose,
  organizations,
  onAddProject,
}: CreateProjectModalProps) {
  const [newProjectName, setNewProjectName] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState(
    () => Object.keys(organizations)[0] || ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create project.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create New Project</h3>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
          >
            <CloseIcon />
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
  );
}
