import { useState } from "react";
import type { WorkTask, WorkTaskStatus, WorkTaskType } from "../types";
import { TaskCard } from "./TaskCard";
import { PlusIcon, EditIcon } from "./Icons";
import { getTaskColorTheme } from "../helpers/TaskColorHelper";
import { CreateTaskModal, EditTaskModal } from "./TaskCrudModals";

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
  onAddTask: (title: string, type: WorkTaskType, description?: string, hours?: number, parentId?: string) => Promise<void>;
  onEditTask: (taskId: string, title: string, type: WorkTaskType, status: WorkTaskStatus, description?: string, hours?: number) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  scope?: string;
}

export function TasksPanel({
  projectName,
  tasks,
  loading,
  searchQuery,
  setSearchQuery,
  taskTypeFilter,
  setTaskTypeFilter,
  statusLabelHelper,
  onAddTask,
  onEditTask,
  onDeleteTask,
  scope,
}: TasksPanelProps) {
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});
  const [activeMobileTab, setActiveMobileTab] = useState<"deliverables" | WorkTaskStatus>("deliverables");
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeParentId, setActiveParentId] = useState<string | undefined>(undefined);
  const [activeParentTitle, setActiveParentTitle] = useState<string | undefined>(undefined);
  const [selectedEditTask, setSelectedEditTask] = useState<WorkTask | null>(null);

  const scopes = scope?.split(" ") || [];
  const canWrite = scopes.includes("write:tasks");

  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedTaskIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Helper: Get Breadcrumb Parent Path
  const getTaskParentPath = (taskId: string): string | null => {
    for (const topTask of tasks) {
      if (topTask.id === taskId) return null;
      if (topTask.children) {
        for (const subTask of topTask.children) {
          if (subTask.id === taskId) return topTask.title;
          if (subTask.children) {
            for (const subSubTask of subTask.children) {
              if (subSubTask.id === taskId) {
                return `${topTask.title} › ${subTask.title}`;
              }
            }
          }
        }
      }
    }
    return null;
  };

  // Helper: Get Top Level Ancestor ID
  const getTopLevelAncestorId = (taskId: string): string => {
    for (const topTask of tasks) {
      if (topTask.id === taskId) return topTask.id;
      if (topTask.children) {
        for (const subTask of topTask.children) {
          if (subTask.id === taskId) return topTask.id;
          if (subTask.children) {
            for (const subSubTask of subTask.children) {
              if (subSubTask.id === taskId) return topTask.id;
            }
          }
        }
      }
    }
    return taskId;
  };

  // Recursive Leaf Task Collector
  const collectLeafTasks = (taskArray: WorkTask[]): WorkTask[] => {
    let leaves: WorkTask[] = [];
    for (const t of taskArray) {
      if (!t.children || t.children.length === 0) {
        leaves.push(t);
      } else {
        leaves.push(...collectLeafTasks(t.children));
      }
    }
    return leaves;
  };

  // Filter leaf tasks by search and type
  const allLeafTasks = collectLeafTasks(tasks);
  const filteredLeafTasks = allLeafTasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description &&
        task.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType =
      taskTypeFilter === "All" || task.type === taskTypeFilter;
    return matchesSearch && matchesType;
  });

  const getLeafTasksByStatus = (status: WorkTaskStatus) => {
    return filteredLeafTasks.filter((t) => t.status === status);
  };

  const handleOpenAddSubtask = (parentId: string, parentTitle: string) => {
    setActiveParentId(parentId);
    setActiveParentTitle(parentTitle);
    setIsCreateOpen(true);
  };

  const handleOpenAddTopLevel = () => {
    setActiveParentId(undefined);
    setActiveParentTitle(undefined);
    setIsCreateOpen(true);
  };

  // Recursive Deliverables Tree Rendering
  const renderDeliverableNode = (task: WorkTask, depth: number = 0, topLevelId: string = "") => {
    const currentTopLevelId = topLevelId || task.id;
    const theme = getTaskColorTheme(currentTopLevelId);
    const isExpanded = !!expandedTaskIds[task.id];
    const hasChildren = task.children && task.children.length > 0;

    return (
      <div key={task.id} className="tree-task-node" style={{ marginLeft: depth > 0 ? "14px" : "0px" }}>
        <div
          className={`tree-task-row ${hasChildren ? "has-children" : ""}`}
          style={{ borderLeft: `3px solid ${theme.primary}` }}
          onClick={() => hasChildren && toggleExpand(task.id)}
        >
          <span className="tree-expand-icon">
            {hasChildren ? (isExpanded ? "▼" : "▶") : "•"}
          </span>
          <span className="tree-task-title" title={task.title}>
            {task.title}
          </span>
          <span className={`project-badge status-${task.status.toLowerCase()}`}>
            {statusLabelHelper(task.status)}
          </span>

          <div className="tree-task-actions">
            {canWrite && depth < 2 && (
              <button
                type="button"
                className="btn-tree-action"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenAddSubtask(task.id, task.title);
                }}
                title="Add Subtask"
              >
                <PlusIcon size={10} />
              </button>
            )}
            <button
              type="button"
              className="btn-tree-action"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEditTask(task);
              }}
              title="View/Edit Details"
            >
              <EditIcon size={10} />
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="tree-children-container">
            {task.children!.map((child) => renderDeliverableNode(child, depth + 1, currentTopLevelId))}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="tasks-panel">
      <div className="tasks-header">
        <div className="active-project-info">
          <h2>{projectName}</h2>
          <p>Consulting Deliverables & Tasks Overview</p>
        </div>

        {/* Search and Filters */}
        <div className="tasks-filter-container">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="tasks-search-input search-input"
          />

          <select
            value={taskTypeFilter}
            onChange={(e) => setTaskTypeFilter(e.target.value)}
            className="tasks-type-select"
          >
            <option value="All">All Types</option>
            <option value="Development">Development</option>
            <option value="Design">Design</option>
            <option value="Testing">Testing</option>
            <option value="Research">Research</option>
            <option value="Documentation">Documentation</option>
            <option value="ProofOfConcept">Proof of Concept</option>
            <option value="Triage">Triage</option>
          </select>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="mobile-tabs-container">
        <button
          type="button"
          className={`mobile-tab-btn ${activeMobileTab === "deliverables" ? "active" : ""}`}
          onClick={() => setActiveMobileTab("deliverables")}
        >
          <span>Deliverables</span>
          <span className="tab-count">{tasks.length}</span>
        </button>
        {(["NotStarted", "InProgress", "OnHold", "Completed"] as WorkTaskStatus[]).map((status) => {
          const count = getLeafTasksByStatus(status).length;
          return (
            <button
              key={status}
              type="button"
              className={`mobile-tab-btn ${activeMobileTab === status ? "active" : ""}`}
              onClick={() => setActiveMobileTab(status)}
            >
              <span>{statusLabelHelper(status)}</span>
              <span className="tab-count">{count}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="empty-state">
          <h3>Loading deliverables...</h3>
        </div>
      ) : projectName === "Select a Project" || !projectName ? (
        <div className="empty-state">
          <h3>No active project selected</h3>
          <p>Get started by selecting an existing project or creating a new one in the sidebar.</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <h3>No tasks found</h3>
          <p>This project currently has no registered consulting tasks.</p>
          {canWrite && (
            <button type="button" onClick={handleOpenAddTopLevel} className="btn-add-project">
              <PlusIcon /> Add First Deliverable
            </button>
          )}
        </div>
      ) : (
        <div className="tasks-columns">
          {/* Column 1: Deliverables Tree */}
          <div className={`tasks-column deliverables-column ${activeMobileTab === "deliverables" ? "mobile-active" : ""}`}>
            <div className="column-header">
              <span className="column-title">Deliverables</span>
              <span className="task-count">{tasks.length}</span>
            </div>
            <div className="tree-list-container">
              {tasks.map((task) => renderDeliverableNode(task, 0))}
            </div>
            {canWrite && (
              <button
                type="button"
                onClick={handleOpenAddTopLevel}
                className="btn-add-project"
              >
                <PlusIcon /> Add Deliverable
              </button>
            )}
          </div>

          {/* Columns 2-5: Leaf Task Kanban Boards */}
          {(["NotStarted", "InProgress", "OnHold", "Completed"] as WorkTaskStatus[]).map((status) => {
            const columnTasks = getLeafTasksByStatus(status);
            return (
              <div className={`tasks-column ${activeMobileTab === status ? "mobile-active" : ""}`} key={status}>
                <div className="column-header">
                  <span className="column-title">{statusLabelHelper(status)}</span>
                  <span className="task-count">{columnTasks.length}</span>
                </div>

                <div className="tasks-list-container">
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      topLevelId={getTopLevelAncestorId(task.id)}
                      parentPath={getTaskParentPath(task.id) || undefined}
                      onClick={() => setSelectedEditTask(task)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Task Modal */}
      {isCreateOpen && (
        <CreateTaskModal
          parentId={activeParentId}
          parentTitle={activeParentTitle}
          onClose={() => setIsCreateOpen(false)}
          onAddTask={async (title, type, description, hours, parentId) => {
            await onAddTask(title, type, description, hours, parentId);
            if (parentId) {
              setExpandedTaskIds((prev) => ({
                ...prev,
                [parentId]: true,
              }));
            }
          }}
        />
      )}

      {/* Edit Task Modal */}
      {selectedEditTask && (
        <EditTaskModal
          task={selectedEditTask}
          canWrite={canWrite}
          onClose={() => setSelectedEditTask(null)}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
        />
      )}
    </section>
  );
}
