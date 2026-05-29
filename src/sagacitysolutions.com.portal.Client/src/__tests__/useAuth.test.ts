import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAuth } from "../useAuth";
import { fetchMe } from "../api";

vi.mock("../api", () => ({
  fetchMe: vi.fn(),
}));

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should start in loading status and transition to authenticated on success", async () => {
    const mockUser = {
      username: "consultant_alpha",
      organizations: { tenant1: "Acme Corp" },
      portal_project_ids: ["*"],
    };
    vi.mocked(fetchMe).mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth());

    // Verify initial status is loading
    expect(result.current).toEqual({ status: "loading" });

    // Await async resolver transition
    await waitFor(() => {
      expect(result.current.status).toBe("authenticated");
    });

    expect(result.current).toEqual({
      status: "authenticated",
      user: mockUser,
    });
  });

  it("should transition to unauthenticated when fetchMe returns null", async () => {
    vi.mocked(fetchMe).mockResolvedValue(null);

    const { result } = renderHook(() => useAuth());

    expect(result.current).toEqual({ status: "loading" });

    await waitFor(() => {
      expect(result.current.status).toBe("unauthenticated");
    });
  });

  it("should transition to unauthenticated when fetchMe throws a network error", async () => {
    vi.mocked(fetchMe).mockRejectedValue(new Error("API Timeout"));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.status).toBe("unauthenticated");
    });
  });

  it("should re-check auth state when the window focus event triggers", async () => {
    const initialUser = { username: "first_user", organizations: {}, portal_project_ids: [] };
    const refreshedUser = { username: "second_user", organizations: {}, portal_project_ids: [] };

    vi.mocked(fetchMe).mockResolvedValueOnce(initialUser).mockResolvedValueOnce(refreshedUser);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.status).toBe("authenticated");
    });
    expect(vi.mocked(fetchMe)).toHaveBeenCalledTimes(1);

    // Trigger window focus wrapped in act to capture async state updates cleanly
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    // Verify useAuth re-fetched and updated user details
    await waitFor(() => {
      expect(result.current.status).toBe("authenticated");
      // @ts-ignore (assert username matches updated value)
      expect(result.current.user.username).toBe("second_user");
    });

    expect(vi.mocked(fetchMe)).toHaveBeenCalledTimes(2);
  });
});
