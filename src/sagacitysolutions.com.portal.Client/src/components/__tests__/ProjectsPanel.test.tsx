import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProjectsPanel } from "../ProjectsPanel";
import type { Project } from "../../types";

describe("ProjectsPanel Role Authorization Scopes", () => {
  const mockProjects: Project[] = [
    { id: "proj-1", tenantId: "tenant1", name: "Alpha Project", status: "Active", version: 1 },
    { id: "proj-2", tenantId: "tenant1", name: "Beta Project", status: "Active", version: 1 },
  ];

  const mockOrganizations = {
    tenant1: "Acme Corp",
  };

  const defaultProps = {
    projects: mockProjects,
    activeProjectId: "proj-1",
    portalProjectIds: ["*"],
    onSelectProject: vi.fn(),
    organizations: mockOrganizations,
    scope: "read:projects write:projects",
    onAddProject: vi.fn(),
    onDeleteProject: vi.fn(),
    onEditProject: vi.fn(),
  };

  it("should render list of projects successfully", () => {
    render(<ProjectsPanel {...defaultProps} />);

    expect(screen.getByText("Alpha Project")).toBeDefined();
    expect(screen.getByText("Beta Project")).toBeDefined();
  });

  it("should hide 'Add Project' button when write:projects scope is missing", () => {
    render(<ProjectsPanel {...defaultProps} scope="read:projects" />);

    const addBtn = screen.queryByRole("button", { name: "Add Project" });
    expect(addBtn).toBeNull();
  });

  it("should show 'Add Project' button when write:projects scope is present", () => {
    render(<ProjectsPanel {...defaultProps} scope="read:projects write:projects" />);

    const addBtn = screen.getByRole("button", { name: "Add Project" });
    expect(addBtn).toBeDefined();
  });

  it("should hide edit and delete action buttons when project is restricted and wildcard is missing", () => {
    // portalProjectIds only grants access to proj-2
    render(
      <ProjectsPanel
        {...defaultProps}
        portalProjectIds={["proj-2"]}
      />
    );

    // Edit and Delete buttons for proj-1 (which is restricted) should NOT be present.
    // In our ProjectsPanel layout, edit/delete buttons have title attributes "Edit Project" and "Delete Project"
    const editButtons = screen.queryAllByTitle("Edit Project");
    const deleteButtons = screen.queryAllByTitle("Delete Project");

    // Should only render actions for the 1 accessible project (proj-2), not the restricted one (proj-1)
    expect(editButtons.length).toBe(1);
    expect(deleteButtons.length).toBe(1);
  });

  it("should show edit and delete action buttons for all projects when wildcard '*' is present", () => {
    render(
      <ProjectsPanel
        {...defaultProps}
        portalProjectIds={["*"]}
      />
    );

    const editButtons = screen.queryAllByTitle("Edit Project");
    const deleteButtons = screen.queryAllByTitle("Delete Project");

    // Both projects should have action buttons
    expect(editButtons.length).toBe(2);
    expect(deleteButtons.length).toBe(2);
  });
});
