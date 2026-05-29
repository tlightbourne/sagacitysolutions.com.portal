import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateProjectModal } from "../CreateProjectModal";

describe("CreateProjectModal", () => {
  const mockOrganizations = {
    tenant1: "Acme Corp",
    tenant2: "Fintech Inc",
  };

  it("should render input fields, selections, and call onAddProject successfully", async () => {
    const mockOnAddProject = vi.fn().mockResolvedValue(undefined);
    const mockOnClose = vi.fn();

    render(
      <CreateProjectModal
        onClose={mockOnClose}
        organizations={mockOrganizations}
        onAddProject={mockOnAddProject}
      />
    );

    // Assert headers
    expect(screen.getByText("Create New Project")).toBeDefined();

    // Find elements
    const nameInput = screen.getByPlaceholderText("e.g. Cloud Migration Phase 2") as HTMLInputElement;
    const orgSelect = screen.getByRole("combobox") as HTMLSelectElement;
    const submitBtn = screen.getByRole("button", { name: "Create Project" });

    // Verify initial values
    expect(nameInput.value).toBe("");
    expect(orgSelect.value).toBe("tenant1"); // should default to first key

    // Simulate input typing & selection
    fireEvent.change(nameInput, { target: { value: "New Consulting Engagement" } });
    fireEvent.change(orgSelect, { target: { value: "tenant2" } });

    // Submit form
    fireEvent.click(submitBtn);

    // Verify submit button disabled / submitting state shows
    expect(screen.getByText("Creating...")).toBeDefined();

    // Await async execution
    await waitFor(() => {
      expect(mockOnAddProject).toHaveBeenCalledWith("tenant2", "New Consulting Engagement");
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("should call onClose when clicking the close button", () => {
    const mockOnClose = vi.fn();
    render(
      <CreateProjectModal
        onClose={mockOnClose}
        organizations={mockOrganizations}
        onAddProject={vi.fn()}
      />
    );

    const closeBtn = screen.getByRole("button", { name: "" }); // icon button has empty string name
    fireEvent.click(closeBtn);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
