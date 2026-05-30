import type { WorkTask } from "../types";
import { ClockIcon, SubtaskIcon } from "./Icons";
import { getTaskColorTheme } from "../helpers/TaskColorHelper";

interface TaskCardProps {
  task: WorkTask;
  onClick: () => void;
  topLevelId?: string;
  parentPath?: string;
}

export function TaskCard({ task, onClick, topLevelId, parentPath }: TaskCardProps) {
  const theme = topLevelId ? getTaskColorTheme(topLevelId) : null;

  return (
    <div
      className="task-card"
      onClick={onClick}
      style={theme ? {
        borderLeft: `4px solid ${theme.primary}`,
        background: `linear-gradient(to right, ${theme.background}, var(--glass-bg))`,
        boxShadow: `0 4px 15px -3px ${theme.border}`
      } : {}}
    >
      {parentPath && (
        <div className="task-parent-path" style={theme ? { color: theme.textLight, fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px", opacity: 1 } : {}}>
          {parentPath}
        </div>
      )}

      <span className={`task-type-badge type-${task.type.toLowerCase()}`}>
        {task.type}
      </span>
      <h3 className="task-title" style={{ marginTop: "6px" }}>{task.title}</h3>

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
