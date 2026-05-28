import type { WorkTask, WorkTaskStatus } from "../types";
import { TaskCard } from "./TaskCard";

interface TasksPanelProps {
  projectName: string;
  tasks: WorkTask[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  taskTypeFilter: string;
  setTaskTypeFilter: (filter: string) => void;
  onSelectTask: (task: WorkTask) => void;
  statusLabelHelper: (status: WorkTaskStatus) => string;
}

export function TasksPanel({
  projectName,
  tasks,
  loading,
  searchQuery,
  setSearchQuery,
  taskTypeFilter,
  setTaskTypeFilter,
  onSelectTask,
  statusLabelHelper,
}: TasksPanelProps) {
  // Filter Tasks by search and type selector
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description &&
        task.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType =
      taskTypeFilter === "All" || task.type === taskTypeFilter;
    return matchesSearch && matchesType;
  });

  // Group tasks by status for columns
  const getTasksByStatus = (status: WorkTaskStatus) => {
    return filteredTasks.filter((t) => t.status === status);
  };

  return (
    <section className="tasks-panel">
      <div className="tasks-header">
        <div className="active-project-info">
          <h2>{projectName}</h2>
          <p>Consulting Deliverables & Tasks Overview</p>
        </div>

        {/* Search and Filters */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(170, 59, 255, 0.15)",
              padding: "0.55rem 1rem",
              borderRadius: "10px",
              color: "white",
              fontSize: "0.82rem",
              width: "200px",
              outline: "none",
              transition: "var(--transition-fast)",
            }}
            className="search-input"
          />

          <select
            value={taskTypeFilter}
            onChange={(e) => setTaskTypeFilter(e.target.value)}
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(170, 59, 255, 0.15)",
              padding: "0.55rem 1rem",
              borderRadius: "10px",
              color: "white",
              fontSize: "0.82rem",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="All">All Types</option>
            <option value="Development">Development</option>
            <option value="Design">Design</option>
            <option value="Testing">Testing</option>
            <option value="Research">Research</option>
            <option value="Documentation">Documentation</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <h3>Loading deliverables...</h3>
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <h3>No tasks found</h3>
          <p>This project currently has no registered consulting tasks.</p>
        </div>
      ) : (
        <div className="tasks-columns">
          {(
            ["NotStarted", "InProgress", "Completed", "OnHold"] as WorkTaskStatus[]
          ).map((status) => {
            const columnTasks = getTasksByStatus(status);
            return (
              <div className="tasks-column" key={status}>
                <div className="column-header">
                  <span className="column-title">
                    {statusLabelHelper(status)}
                  </span>
                  <span className="task-count">{columnTasks.length}</span>
                </div>

                <div className="tasks-list-container">
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => onSelectTask(task)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
