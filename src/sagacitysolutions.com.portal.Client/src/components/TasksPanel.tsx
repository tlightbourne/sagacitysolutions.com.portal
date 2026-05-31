import { useState, useEffect, useRef } from "react";
import type { WorkTask, WorkTaskStatus, WorkTaskType, Project, ProjectStatus } from "../types";
import { TaskCard } from "./TaskCard";
import {
  PlusIcon,
  EditIcon,
  FolderIcon,
  EyeIcon,
  EyeOffIcon,
  CopyIcon,
  CheckIcon,
  TrashIcon,
} from "./Icons";
import { getTaskColorTheme } from "../helpers/TaskColorHelper";
import { CreateTaskModal, EditTaskModal } from "./TaskCrudModals";
import { CreateProjectModal } from "./CreateProjectModal";
import { EditProjectModal } from "./EditProjectModal";

interface TasksPanelProps {
  projectName: string;
  projects: Project[];
  activeProject: Project | null;
  portalProjectIds: string[];
  onSelectProject: (project: Project) => void;
  onAddProject: (tenantId: string, name: string) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
  onEditProject: (projectId: string, name: string, status: ProjectStatus) => Promise<void>;
  organizations: Record<string, string>;
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
  onReorderTask?: (taskId: string, newStatus: WorkTaskStatus, newOrder: number) => Promise<void>;
  scope?: string;
}

export function TasksPanel({
  projectName,
  projects,
  activeProject,
  portalProjectIds,
  onSelectProject,
  onAddProject,
  onDeleteProject,
  onEditProject,
  organizations,
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
  onReorderTask,
  scope,
}: TasksPanelProps) {
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});
  const [activeMobileTab, setActiveMobileTab] = useState<"deliverables" | WorkTaskStatus>("deliverables");
  
  // Projects Dropdown Switcher State
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [copiedProjectId, setCopiedProjectId] = useState<string | null>(null);

  // View Mode Switcher state
  const [viewMode, setViewMode] = useState<"all" | "tree" | "board">("all");

  // Compact View state
  const [isCompactView, setIsCompactView] = useState(true);

  // Project Modals state
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Drag & Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<WorkTaskStatus | null>(null);

  // Task Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeParentId, setActiveParentId] = useState<string | undefined>(undefined);
  const [activeParentTitle, setActiveParentTitle] = useState<string | undefined>(undefined);
  const [selectedEditTask, setSelectedEditTask] = useState<WorkTask | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const scopes = scope?.split(" ") || [];
  const canWrite = scopes.includes("write:tasks");
  const hasWriteProjectScope = scopes.includes("write:projects");
  const canAddProject = hasWriteProjectScope && Object.keys(organizations).length > 0;

  // Handle clicking outside to close projects dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopyId = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
      setCopiedProjectId(id);
      setTimeout(() => setCopiedProjectId(null), 2000);
    } catch (err) {
      console.error("Failed to copy ID to clipboard:", err);
    }
  };

  const handleOpenEditModal = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setEditingProject(project);
    setIsEditProjectModalOpen(true);
  };

  const visibleProjects = projects
    .filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(projectSearchQuery.toLowerCase());
      const matchesArchive = showArchived || p.status !== "Archived";
      return matchesSearch && matchesArchive;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const archivedCount = projects.filter((p) => p.status === "Archived").length;

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
    return filteredLeafTasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.order - b.order);
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOverCard = (e: React.DragEvent, targetCardId: string) => {
    e.preventDefault();
    if (draggedTaskId === targetCardId) return;
    setDragOverCardId(targetCardId);
  };

  const handleDragLeaveCard = () => {
    setDragOverCardId(null);
  };

  const handleDropOnCard = async (e: React.DragEvent, targetTask: WorkTask) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCardId(null);
    setDragOverColumn(null);
    
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!taskId || taskId === targetTask.id) return;

    if (onReorderTask) {
      await onReorderTask(taskId, targetTask.status, targetTask.order);
    }
    setDraggedTaskId(null);
  };

  const handleDragOverColumn = (e: React.DragEvent, status: WorkTaskStatus) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDragLeaveColumn = () => {
    setDragOverColumn(null);
  };

  const handleDropOnColumn = async (e: React.DragEvent, status: WorkTaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    setDragOverCardId(null);
    
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!taskId) return;

    // Calculate order to append to the end
    const columnTasks = getLeafTasksByStatus(status);
    const isSameColumn = columnTasks.some(t => t.id === taskId);
    const newOrder = isSameColumn ? columnTasks.length : columnTasks.length + 1;

    if (onReorderTask) {
      await onReorderTask(taskId, status, newOrder);
    }
    setDraggedTaskId(null);
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
      {/* ── Header Row 1: Context Switcher & Main Filter ── */}
      <div className="tasks-header-row-1">
        <div className="active-project-info">
          {/* Dropdown Selector Container */}
          <div className="project-selector-container" ref={dropdownRef}>
            <button
              type="button"
              className="project-dropdown-trigger"
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
            >
              <FolderIcon size={18} />
              <span className="project-dropdown-name">
                {activeProject ? activeProject.name : "Select a Project"}
              </span>
              <span className={`dropdown-caret ${isProjectDropdownOpen ? "open" : ""}`}>▼</span>
            </button>

            {isProjectDropdownOpen && (
              <div className="projects-dropdown-menu">
                <div className="dropdown-search-wrapper">
                  <input
                    type="text"
                    placeholder="Filter projects..."
                    value={projectSearchQuery}
                    onChange={(e) => setProjectSearchQuery(e.target.value)}
                    className="dropdown-search-input"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {archivedCount > 0 && (
                  <div className="dropdown-filter-toggle" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className={`btn-toggle-archived ${showArchived ? "active" : ""}`}
                      onClick={() => setShowArchived(!showArchived)}
                    >
                      {showArchived ? <EyeOffIcon /> : <EyeIcon />}
                      {showArchived ? `Hide Archived (${archivedCount})` : `Show Archived (${archivedCount})`}
                    </button>
                  </div>
                )}

                <div className="dropdown-projects-list">
                  {visibleProjects.length === 0 ? (
                    <div className="dropdown-empty">No projects found</div>
                  ) : (
                    visibleProjects.map((project) => {
                      const isGranted =
                        portalProjectIds.includes("*") ||
                        portalProjectIds.includes(project.id);
                      const isSelected = activeProject?.id === project.id;

                      const hasWriteScope = scopes.includes("write:projects");
                      const canDelete = hasWriteScope && isGranted;
                      const canEdit = hasWriteScope && isGranted;

                      return (
                        <div
                          key={project.id}
                          className={`project-card ${isSelected ? "active" : ""}`}
                          onClick={() => {
                            if (isGranted) {
                              onSelectProject(project);
                              setIsProjectDropdownOpen(false);
                            }
                          }}
                          style={{
                            opacity: isGranted ? 1 : 0.6,
                            cursor: isGranted ? "pointer" : "not-allowed",
                          }}
                        >
                          <div className="project-card-header">
                            <span className="project-name">{project.name}</span>
                            {(canEdit || canDelete) && (
                              <div className="project-actions" onClick={(e) => e.stopPropagation()}>
                                {canEdit && (
                                  <button
                                    type="button"
                                    className="btn-edit-project"
                                    onClick={(e) => handleOpenEditModal(e, project)}
                                    title="Edit Project"
                                  >
                                    <EditIcon size={12} />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    type="button"
                                    className="btn-delete-project-new"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (confirm(`Are you sure you want to delete the project "${project.name}"?`)) {
                                        try {
                                          await onDeleteProject(project.id);
                                        } catch (err) {
                                          const message = err instanceof Error ? err.message : "Failed to delete project.";
                                          alert(message);
                                        }
                                      }
                                    }}
                                    title="Delete Project"
                                  >
                                    <TrashIcon size={12} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="project-meta">
                            <span className={`project-badge status-${project.status.toLowerCase()}`}>
                              {project.status}
                            </span>
                            <button
                              type="button"
                              className="project-id-copy-btn"
                              onClick={(e) => handleCopyId(e, project.id)}
                              title="Copy Full Project ID"
                            >
                              <span className="project-id-text">
                                {copiedProjectId === project.id ? "Copied!" : `${(project.id || "").substring(0, 8)}...`}
                              </span>
                              {copiedProjectId === project.id ? <CheckIcon /> : <CopyIcon />}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {canAddProject && (
                  <div className="dropdown-footer" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="btn-add-project"
                      onClick={() => setIsProjectModalOpen(true)}
                    >
                      <PlusIcon size={14} />
                      Add Project
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="project-subtitle">Consulting Deliverables & Tasks Overview</p>
        </div>

        {/* Global Filters: Search & Type */}
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

      {/* ── Header Row 2: Layout Controls (Full Width Spanning Bar) ── */}
      <div className="tasks-header-row-2">
        {/* Segmented View Mode Tabs */}
        <div className="view-mode-tabs">
          <button
            type="button"
            className={`view-tab-btn ${viewMode === "all" ? "active" : ""}`}
            onClick={() => setViewMode("all")}
          >
            📋 Split View
          </button>
          <button
            type="button"
            className={`view-tab-btn ${viewMode === "tree" ? "active" : ""}`}
            onClick={() => setViewMode("tree")}
          >
            🌳 Deliverables
          </button>
          <button
            type="button"
            className={`view-tab-btn ${viewMode === "board" ? "active" : ""}`}
            onClick={() => setViewMode("board")}
          >
            📊 Kanban Board
          </button>
        </div>

        {/* Compact View Toggle & Task Counts */}
        <div className="board-display-controls">
          {viewMode === "board" && (
            <div className="board-tasks-summary">
              <span className="summary-count">{filteredLeafTasks.length}</span> leaf tasks
            </div>
          )}
          <button
            type="button"
            className={`btn-compact-toggle ${isCompactView ? "active" : ""}`}
            onClick={() => setIsCompactView(!isCompactView)}
            title="Toggle high-density compact cards view"
          >
            {isCompactView ? "📱 Expand Cards" : "🗜️ Compact Cards"}
          </button>
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
          <p>Get started by selecting an existing project or creating a new one in the top switcher.</p>
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
        <div className={`tasks-columns ${viewMode === "board" ? "full-board-view" : ""} ${viewMode === "tree" ? "full-tree-view" : ""}`}>
          {/* Column 1: Deliverables Tree */}
          {(viewMode === "all" || viewMode === "tree") && (
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
          )}

          {/* Columns 2-5: Leaf Task Kanban Boards */}
          {(viewMode === "all" || viewMode === "board") && (
            (["NotStarted", "InProgress", "OnHold", "Completed"] as WorkTaskStatus[]).map((status) => {
              const columnTasks = getLeafTasksByStatus(status);
              const isColumnDraggedOver = dragOverColumn === status;
              return (
                <div
                  className={`tasks-column ${activeMobileTab === status ? "mobile-active" : ""} ${isColumnDraggedOver ? "column-drag-over" : ""}`}
                  key={status}
                  onDragOver={canWrite ? (e) => handleDragOverColumn(e, status) : undefined}
                  onDragLeave={canWrite ? handleDragLeaveColumn : undefined}
                  onDrop={canWrite ? (e) => handleDropOnColumn(e, status) : undefined}
                >
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
                        draggable={canWrite}
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragOver={canWrite ? (e) => handleDragOverCard(e, task.id) : undefined}
                        onDragLeave={canWrite ? handleDragLeaveCard : undefined}
                        onDrop={canWrite ? (e) => handleDropOnCard(e, task) : undefined}
                        isDragOver={dragOverCardId === task.id}
                        isCompact={isCompactView}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
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

      {/* Create Project Modal */}
      {isProjectModalOpen && (
        <CreateProjectModal
          onClose={() => setIsProjectModalOpen(false)}
          organizations={organizations}
          onAddProject={onAddProject}
        />
      )}

      {/* Edit Project Modal */}
      {isEditProjectModalOpen && editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => {
            setIsEditProjectModalOpen(false);
            setEditingProject(null);
          }}
          onEditProject={onEditProject}
        />
      )}
    </section>
  );
}
