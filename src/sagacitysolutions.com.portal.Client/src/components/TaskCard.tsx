import type { WorkTask } from "../types";
import { ClockIcon } from "./Icons";
import { getTaskColorTheme } from "../helpers/TaskColorHelper";

interface TaskCardProps {
  task: WorkTask;
  onClick: () => void;
  topLevelId?: string;
  parentPath?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragOver?: boolean;
  isCompact?: boolean;
}

export function TaskCard({
  task,
  onClick,
  topLevelId,
  parentPath,
  draggable,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragOver,
  isCompact,
}: TaskCardProps) {
  const theme = topLevelId ? getTaskColorTheme(topLevelId) : null;

  if (isCompact) {
    return (
      <div
        className={`task-card compact ${isDragOver ? "card-drag-over" : ""}`}
        onClick={onClick}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={theme ? {
          borderLeft: `3px solid ${theme.primary}`,
          background: `linear-gradient(to right, ${theme.background}, var(--glass-bg))`,
          boxShadow: `0 2px 8px -2px ${theme.border}`
        } : {}}
      >
        <div className="compact-task-header">
          <span className={`task-type-badge type-${task.type.toLowerCase()}`}>
            {task.type}
          </span>
          {task.hours ? (
            <span className="task-hours compact">
              {task.hours}h
            </span>
          ) : null}
        </div>
        <h3 className="task-title compact" title={task.title}>{task.title}</h3>
      </div>
    );
  }

  return (
    <div
      className={`task-card ${isDragOver ? "card-drag-over" : ""}`}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={theme ? {
        borderLeft: `4px solid ${theme.primary}`,
        background: `linear-gradient(to right, ${theme.background}, var(--glass-bg))`,
        boxShadow: `0 4px 15px -3px ${theme.border}`
      } : {}}
    >
      {parentPath && (
        <div className="task-parent-path" style={theme ? { color: theme.textLight } : {}}>
          {parentPath}
        </div>
      )}

      <span className={`task-type-badge type-${task.type.toLowerCase()}`}>
        {task.type}
      </span>
      <h3 className="task-title">{task.title}</h3>

      <div className="task-card-footer">
        <div className="task-hours">
          <ClockIcon />
          {task.hours ? `${task.hours} hrs` : "N/A"}
        </div>
        {task.children && task.children.length > 0 && (
          <div className="task-subtasks-count">
            <SubtaskIcon />
            {task.children.length}
          </div>
        )}
      </div>
    </div>
  );
}
