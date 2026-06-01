import { useState } from "react";
import type { WorkTask, WorkTaskStatus, WorkTaskType, Project, ProjectStatus } from "../types";
import { PlusIcon } from "./Icons";
import { CreateTaskModal, EditTaskModal } from "./TaskCrudModals";
import { CreateProjectModal } from "./CreateProjectModal";
import { EditProjectModal } from "./EditProjectModal";

import { ProjectSelector } from "./ProjectSelector";
import { TaskFilterBar, TasksLayoutControls } from "./TaskFilterBar";
import { DeliverablesTree } from "./DeliverablesTree";
import { KanbanBoard } from "./KanbanBoard";

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

  // View Mode Switcher state
  const [viewMode, setViewMode] = useState<"all" | "tree" | "board">("all");

  // Compact View state
  const [isCompactView, setIsCompactView] = useState(true);

  // Project Modals state
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Task Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeParentId, setActiveParentId] = useState<string | undefined>(undefined);
  const [activeParentTitle, setActiveParentTitle] = useState<string | undefined>(undefined);
  const [selectedEditTask, setSelectedEditTask] = useState<WorkTask | null>(null);

  const scopes = scope?.split(" ") || [];
  const canWrite = scopes.includes("write:tasks");
  const hasWriteProjectScope = scopes.includes("write:projects");
  const canAddProject = hasWriteProjectScope && Object.keys(organizations).length > 0;

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

  return (
    <section className="tasks-panel">
      {/* ── Header Row 1: Context Switcher & Main Filter ── */}
      <div className="tasks-header-row-1">
        <ProjectSelector
          projects={projects}
          activeProject={activeProject}
          portalProjectIds={portalProjectIds}
          onSelectProject={onSelectProject}
          onDeleteProject={onDeleteProject}
          onOpenCreateProjectModal={() => setIsProjectModalOpen(true)}
          onOpenEditProjectModal={(project) => {
            setEditingProject(project);
            setIsEditProjectModalOpen(true);
          }}
          organizations={organizations}
          scopes={scopes}
        />

        <TaskFilterBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          taskTypeFilter={taskTypeFilter}
          setTaskTypeFilter={setTaskTypeFilter}
        />
      </div>

      {/* ── Header Row 2: Layout Controls (Full Width Spanning Bar) ── */}
      <TasksLayoutControls
        viewMode={viewMode}
        setViewMode={setViewMode}
        isCompactView={isCompactView}
        setIsCompactView={setIsCompactView}
        filteredLeafTasksCount={filteredLeafTasks.length}
      />

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
          <DeliverablesTree
            tasks={tasks}
            viewMode={viewMode}
            activeMobileTab={activeMobileTab}
            canWrite={canWrite}
            expandedTaskIds={expandedTaskIds}
            onToggleExpand={toggleExpand}
            onOpenAddSubtask={handleOpenAddSubtask}
            onOpenAddTopLevel={handleOpenAddTopLevel}
            onOpenEditTask={(task) => setSelectedEditTask(task)}
            statusLabelHelper={statusLabelHelper}
          />

          {/* Columns 2-5: Leaf Task Kanban Boards */}
          <KanbanBoard
            viewMode={viewMode}
            activeMobileTab={activeMobileTab}
            filteredLeafTasks={filteredLeafTasks}
            isCompactView={isCompactView}
            canWrite={canWrite}
            onReorderTask={onReorderTask}
            onOpenEditTask={(task) => setSelectedEditTask(task)}
            statusLabelHelper={statusLabelHelper}
            getTopLevelAncestorId={getTopLevelAncestorId}
            getTaskParentPath={getTaskParentPath}
          />
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
