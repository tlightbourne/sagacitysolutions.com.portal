import type { WorkTask } from "../types";

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
          <svg
            width="12"
            height="12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {task.hours ? `${task.hours} hrs` : "N/A"}
        </div>
        {task.children && task.children.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            <svg
              width="12"
              height="12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            {task.children.length}
          </div>
        )}
      </div>
    </div>
  );
}
