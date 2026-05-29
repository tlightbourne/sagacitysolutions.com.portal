import type { WorkTask } from "../types";
import { ClockIcon, SubtaskIcon } from "./Icons";

interface TaskCardProps {
  task: WorkTask;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  return (
    <div className="task-card" onClick={onClick}>
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
