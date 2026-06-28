import { useState, useEffect, useRef } from "react";
import type { Project } from "../types";
import "./ProjectSelector.css";
import {
    FolderIcon,
    EyeIcon,
    EyeOffIcon,
    EditIcon,
    TrashIcon,
    CheckIcon,
    CopyIcon
} from "./Icons";

interface ProjectSelectorProps {
    projects: Project[];
    activeProject: Project;
    portalProjectIds: string[];
    onSelectProject: (project: Project) => void;
    onDeleteProject: (projectId: string) => Promise<void>;
    onOpenCreateProjectModal: () => void;
    onOpenEditProjectModal: (project: Project) => void;
}

export function ProjectSelector({
    projects,
    activeProject,
    portalProjectIds,
    onSelectProject,
    onDeleteProject,
    onOpenCreateProjectModal,
    onOpenEditProjectModal
}: ProjectSelectorProps) {

    const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
    const [projectSearchQuery, setProjectSearchQuery] = useState("");
    const [showArchived, setShowArchived] = useState(false);
    const [copiedProjectId, setCopiedProjectId] = useState<string | null>(null);

    const dropdownRef = useRef<HTMLDivElement>(null);

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
        onOpenEditProjectModal(project);
        setIsProjectDropdownOpen(false);
    };

    const visibleProjects = projects
        .filter((p) => {
            const matchesSearch = p.name.toLowerCase().includes(projectSearchQuery.toLowerCase());
            const matchesArchive = showArchived || p.status !== "Archived";
            return matchesSearch && matchesArchive;
        })
        .sort((a, b) => a.name.localeCompare(b.name));

    const archivedCount = projects.filter((p) => p.status === "Archived").length;

    return (
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

                                    const canDelete = canWriteProjects && isGranted;
                                    const canEdit = canWriteProjects && isGranted;

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
                                    onClick={() => {
                                        onOpenCreateProjectModal();
                                        setIsProjectDropdownOpen(false)
                                    }}
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
    );
}