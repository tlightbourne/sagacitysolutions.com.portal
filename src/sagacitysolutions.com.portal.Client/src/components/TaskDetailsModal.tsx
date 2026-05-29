import type { WorkTask, WorkTaskStatus } from "../types";
import { CloseIcon, ClockIcon, PaperclipIcon } from "./Icons";

interface TaskDetailsModalProps {
  task: WorkTask;
  onClose: () => void;
  statusLabelHelper: (status: WorkTaskStatus) => string;
}

export function TaskDetailsModal({
  task,
  onClose,
  statusLabelHelper,
}: TaskDetailsModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Task Specification</h3>
          <button type="button" className="btn-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="modal-body">
          <div className="details-title-section">
            <div className="details-type-row">
              <span className={`task-type-badge type-${task.type.toLowerCase()}`}>
                {task.type}
              </span>
              <span
                className={`status-pill status-${task.status
                  .toLowerCase()
                  .replace("notstarted", "not-started")
                  .replace("inprogress", "in-progress")}`}
              >
                {statusLabelHelper(task.status)}
              </span>
            </div>
            <h2 className="details-title">{task.title}</h2>
          </div>

          <div className="details-meta-grid">
            <div className="meta-item">
              <span className="meta-label">Logged Hours</span>
              <span className="meta-value">
                <ClockIcon size={14} />
                {task.hours ? `${task.hours} hours` : "None recorded"}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Task Index Order</span>
              <span className="meta-value">#{task.order}</span>
            </div>
          </div>

          <div className="details-description">
            <span className="meta-label">Detailed Scope Description</span>
            {task.description ? (
              <p className="description-text">{task.description}</p>
            ) : (
              <p className="description-text no-description">
                No detailed description has been provided for this task.
              </p>
            )}
          </div>

          {/* Subtasks (Children) */}
          {task.children && task.children.length > 0 && (
            <div className="subtasks-section">
              <span className="meta-label">Sub-Tasks / Checklist</span>
              <div className="subtasks-list">
                {task.children.map((subtask) => (
                  <div className="subtask-item" key={subtask.id}>
                    <span className="subtask-title">{subtask.title}</span>
                    <span
                      className={`status-pill status-${subtask.status
                        .toLowerCase()
                        .replace("notstarted", "not-started")
                        .replace("inprogress", "in-progress")}`}
                    >
                      {statusLabelHelper(subtask.status)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          {task.attachments && task.attachments.length > 0 && (
            <div className="attachments-section">
              <span className="meta-label">Reference Attachments</span>
              <div className="attachments-grid">
                {task.attachments.map((file) => (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="attachment-card"
                    key={file.id}
                  >
                    <PaperclipIcon />
                    <span className="attachment-name">
                      {file.name || "Resource Link"}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
