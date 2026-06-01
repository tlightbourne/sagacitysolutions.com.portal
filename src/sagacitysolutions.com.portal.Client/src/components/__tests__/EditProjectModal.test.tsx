import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EditProjectModal } from "../EditProjectModal";
import type { Project } from "../../types";

describe("EditProjectModal", () => {
  const mockProject: Project = {
    id: "proj-1",
    tenantId: "tenant1",
    name: "Existing Project Name",
    status: "Active",
    version: 42,
  };

  it("should pre-populate fields and submit updated values successfully", async () => {
    const mockOnEditProject = vi.fn().mockResolvedValue(undefined);
    const mockOnClose = vi.fn();

    render(
      <EditProjectModal
        project={mockProject}
        onClose={mockOnClose}
        onEditProject={mockOnEditProject}
      />
    );

    // Assert headers
    expect(screen.getByText("Edit Project Details")).toBeDefined();

    // Find elements
    const nameInput = screen.getByPlaceholderText("e.g. Cloud Migration Phase 2") as HTMLInputElement;
    const statusSelect = screen.getByRole("combobox") as HTMLSelectElement;
    const submitBtn = screen.getByRole("button", { name: "Save Changes" });

    // Verify initial pre-populated values
    expect(nameInput.value).toBe("Existing Project Name");
    expect(statusSelect.value).toBe("Active");

    // Modify values
    fireEvent.change(nameInput, { target: { value: "Updated Project Name" } });
    fireEvent.change(statusSelect, { target: { value: "Completed" } });

    // Submit form
    fireEvent.click(submitBtn);

    // Verify loading label shows
    expect(screen.getByText("Saving...")).toBeDefined();

    // Await submit callback
    await waitFor(() => {
      expect(mockOnEditProject).toHaveBeenCalledWith("proj-1", "Updated Project Name", "Completed", 42);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("should block submit and show validation error if project name is empty", async () => {
    render(
      <EditProjectModal
        project={mockProject}
        onClose={vi.fn()}
        onEditProject={vi.fn()}
      />
    );

    const nameInput = screen.getByPlaceholderText("e.g. Cloud Migration Phase 2") as HTMLInputElement;
    const submitBtn = screen.getByRole("button", { name: "Save Changes" });

    // Clear name input with whitespace to bypass HTML5 native 'required' block but fail custom React trim check
    fireEvent.change(nameInput, { target: { value: "   " } });
    fireEvent.click(submitBtn);

    // Assert error message
    expect(screen.getByText("Project name is required.")).toBeDefined();
  });
});
