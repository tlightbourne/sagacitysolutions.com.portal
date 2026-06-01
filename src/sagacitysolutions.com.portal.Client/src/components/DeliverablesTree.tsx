import type { WorkTask, WorkTaskStatus, WorkTaskType } from "../types";
import { PlusIcon, EditIcon } from "./Icons";
import { getTaskColorTheme } from "../helpers/TaskColorHelper";

interface DeliverablesTreeProps {
    tasks: WorkTask[];
    viewMode: "all" | "tree" | "board";
    activeMobileTab: string;
    canWrite: boolean;
    expandedTaskIds: Record<string, boolean>;
    onToggleExpand: (id: string, e?: React.MouseEvent) => void;
    onOpenAddSubtask: (parentId: string, parentTitle: string) => void;
    onOpenAddTopLevel: () => void;
    onOpenEditTask: (task: WorkTask) => void;
    statusLabelHelper: (status: WorkTaskStatus) => string;
}

export function DeliverablesTree({
    tasks,
    viewMode,
    activeMobileTab,
    canWrite,
    expandedTaskIds,
    onToggleExpand,
    onOpenAddSubtask,
    onOpenAddTopLevel,
    onOpenEditTask,
    statusLabelHelper
}: DeliverablesTreeProps) {

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
                    onClick={() => hasChildren && onToggleExpand(task.id)}
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
                                    onOpenAddSubtask(task.id, task.title);
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
                                onOpenEditTask(task);
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
        <>
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
                            onClick={onOpenAddTopLevel}
                            className="btn-add-project"
                        >
                            <PlusIcon /> Add Deliverable
                        </button>
                    )}
                </div>
            )}
        </>
    )

}