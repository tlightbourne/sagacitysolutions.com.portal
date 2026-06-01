import "./TaskFilterBar.css"

interface TasksLayoutControlsProps {
    //Layout view controls
    viewMode: "all" | "tree" | "board";
    setViewMode: (mode: "all" | "tree" | "board") => void;
    isCompactView: boolean;
    setIsCompactView: (compact: boolean) => void;

    filteredLeafTasksCount: number;
}
export function TasksLayoutControls({
    viewMode,
    setViewMode,
    isCompactView,
    setIsCompactView,
    filteredLeafTasksCount
}: TasksLayoutControlsProps) {

    return (
        <>
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
                </div >

                {/* Compact View Toggle & Task Counts */}
                < div className="board-display-controls" >
                    {viewMode === "board" && (
                        <div className="board-tasks-summary">
                            <span className="summary-count">{filteredLeafTasksCount}</span> leaf tasks
                        </div>
                    )
                    }
                    <button
                        type="button"
                        className={`btn-compact-toggle ${isCompactView ? "active" : ""}`}
                        onClick={() => setIsCompactView(!isCompactView)}
                        title="Toggle high-density compact cards view"
                    >
                        {isCompactView ? "📱 Expand Cards" : "🗜️ Compact Cards"}
                    </button>
                </div >
            </div >
        </>
    )
}
interface TaskFilterBarProps {
    // Search and type filters
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    taskTypeFilter: string;
    setTaskTypeFilter: (filter: string) => void;
}

export function TaskFilterBar({
    searchQuery,
    setSearchQuery,
    taskTypeFilter,
    setTaskTypeFilter,
}: TaskFilterBarProps) {

    return (
        <>
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
        </>
    )
}