import { useState } from "react";
import type { WorkTask, WorkTaskType, WorkTaskStatus } from "../types";
import { CloseIcon } from "./Icons";

interface CreateTaskModalProps {
  parentId?: string;
  parentTitle?: string;
  onClose: () => void;
  onAddTask: (title: string, type: WorkTaskType, description?: string, hours?: number, parentId?: string) => Promise<void>;
}

export function CreateTaskModal({
  parentId,
  parentTitle,
  onClose,
  onAddTask,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<WorkTaskType>("Development");
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const parsedHours = hours.trim() !== "" ? parseInt(hours.trim(), 10) : undefined;
      await onAddTask(
        title.trim(),
        type,
        description.trim() || undefined,
        parsedHours,
        parentId
      );
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create task.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{parentId ? `Add Subtask to "${parentTitle}"` : "Create New Top-Level Task"}</h3>
          <button type="button" className="btn-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body modal-form">
          <div className="modal-input-group">
            <span className="meta-label">Task Title</span>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement OAuth Flow"
              className="modal-input"
            />
          </div>

          <div className="modal-input-group">
            <span className="meta-label">Task Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as WorkTaskType)}
              className="modal-select"
            >
              <option value="Development">Development</option>
              <option value="Testing">Testing</option>
              <option value="Documentation">Documentation</option>
              <option value="Design">Design</option>
              <option value="Research">Research</option>
              <option value="ProofOfConcept">Proof of Concept</option>
              <option value="Triage">Triage</option>
            </select>
          </div>

          <div className="modal-input-group">
            <span className="meta-label">Estimated Hours (Optional)</span>
            <input
              type="number"
              min="0"
              max="255"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="e.g. 8"
              className="modal-input"
            />
          </div>

          <div className="modal-input-group">
            <span className="meta-label">Description (Optional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed description of this consulting deliverable..."
              rows={4}
              className="modal-input modal-input-textarea"
            />
          </div>

          {error && <p className="modal-error-message">{error}</p>}

          <button type="submit" disabled={submitting} className="modal-submit-btn">
            {submitting ? "Creating..." : "Create Task"}
          </button>
        </form>
      </div>
    </div>
  );
}

interface EditTaskModalProps {
  task: WorkTask;
  onClose: () => void;
  onEditTask: (taskId: string, title: string, type: WorkTaskType, status: WorkTaskStatus, description?: string, hours?: number) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  canWrite: boolean;
}

export function EditTaskModal({
  task,
  onClose,
  onEditTask,
  onDeleteTask,
  canWrite,
}: EditTaskModalProps) {
  const [title, setTitle] = useState(task.title);
  const [type, setType] = useState<WorkTaskType>(task.type);
  const [status, setStatus] = useState<WorkTaskStatus>(task.status);
  const [description, setDescription] = useState(task.description || "");
  const [hours, setHours] = useState<string>(task.hours !== undefined ? task.hours.toString() : "");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const isLeafNode = !task.children || task.children.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const parsedHours = hours.trim() !== "" ? parseInt(hours.trim(), 10) : undefined;
      await onEditTask(
        task.id,
        title.trim(),
        type,
        status,
        description.trim() || undefined,
        parsedHours
      );
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update task.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${task.title}"? This will recursively delete all nested subtasks.`)) {
      setDeleting(true);
      setError("");
      try {
        await onDeleteTask(task.id);
        onClose();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete task.";
        setError(message);
      } finally {
        setDeleting(false);
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Task Details</h3>
          <button type="button" className="btn-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body modal-form">
          <div className="modal-input-group">
            <span className="meta-label">Task Title</span>
            <input
              type="text"
              required
              disabled={!canWrite}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="modal-input"
            />
          </div>

          <div className="modal-input-group">
            <span className="meta-label">Task Type</span>
            <select
              value={type}
              disabled={!canWrite}
              onChange={(e) => setType(e.target.value as WorkTaskType)}
              className="modal-select"
            >
              <option value="Development">Development</option>
              <option value="Testing">Testing</option>
              <option value="Documentation">Documentation</option>
              <option value="Design">Design</option>
              <option value="Research">Research</option>
              <option value="ProofOfConcept">Proof of Concept</option>
              <option value="Triage">Triage</option>
            </select>
          </div>

          <div className="modal-input-group">
            <span className="meta-label">Estimated Hours (Optional)</span>
            <input
              type="number"
              min="0"
              max="255"
              disabled={!canWrite}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="modal-input"
            />
          </div>

          <div className="modal-input-group">
            <span className="meta-label">Status</span>
            {isLeafNode ? (
              <select
                value={status}
                disabled={!canWrite}
                onChange={(e) => setStatus(e.target.value as WorkTaskStatus)}
                className="modal-select"
              >
                <option value="NotStarted">To Do</option>
                <option value="InProgress">In Progress</option>
                <option value="OnHold">On Hold</option>
                <option value="Completed">Completed</option>
              </select>
            ) : (
              <div className="parent-status-display">
                <span className={`project-badge status-${task.status.toLowerCase()}`}>
                  {task.status}
                </span>
                <p className="parent-status-explanation">
                  Status is automatically calculated based on subtask statuses.
                </p>
              </div>
            )}
          </div>

          <div className="modal-input-group">
            <span className="meta-label">Description (Optional)</span>
            <textarea
              value={description}
              disabled={!canWrite}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="modal-input modal-input-textarea"
            />
          </div>

          {error && <p className="modal-error-message">{error}</p>}

          <div className="modal-actions-row">
            {canWrite && (
              <button
                type="button"
                disabled={deleting || submitting}
                onClick={handleDelete}
                className="btn-danger-new"
              >
                {deleting ? "Deleting..." : "Delete Task"}
              </button>
            )}
            <button
              type="submit"
              disabled={submitting || deleting || !canWrite}
              className="modal-submit-btn"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
