import { useState } from 'react';
import type { WorkTask, WorkTaskStatus } from '../types';
import { TaskCard } from './TaskCard';
import "./KanbanBoard.css"

interface KanbanBoardProps {
    viewMode: "all" | "tree" | "board";
    activeMobileTab: string;
    filteredLeafTasks: WorkTask[];
    isCompactView: boolean;
    canWrite: boolean;
    onReorderTask?: (taskId: string, newStatus: WorkTaskStatus, newOrder: number) => Promise<void>;
    onOpenEditTask: (task: WorkTask) => void;
    statusLabelHelper: (status: WorkTaskStatus) => string;
    getTopLevelAncestorId: (taskId: string) => string;
    getTaskParentPath: (taskId: string) => string | null;
}
export function KanbanBoard({
    viewMode,
    activeMobileTab,
    filteredLeafTasks,
    isCompactView,
    canWrite,
    onReorderTask,
    onOpenEditTask,
    statusLabelHelper,
    getTopLevelAncestorId,
    getTaskParentPath,
}: KanbanBoardProps) {
    // Drag & Drop State
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<WorkTaskStatus | null>(null);


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

    return (
        <>
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
                                        onClick={() => onOpenEditTask(task)}
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
        </>
    )

}