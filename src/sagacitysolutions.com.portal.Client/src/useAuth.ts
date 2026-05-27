import { useEffect, useState } from "react";
import { fetchMe, type UserClaims } from "./api";

type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: UserClaims }
  | { status: "unauthenticated" };

/**
 * Resolves the current auth state by calling the BFF on mount.
 * Re-fetches whenever the window regains focus (handles post-redirect state).
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      setState({ status: "loading" });
      try {
        const data = await fetchMe();
        if (!cancelled) {
          setState(
            data?.username ? { status: "authenticated", user: data } : { status: "unauthenticated" }
          );
        }
      } catch {
        if (!cancelled) setState({ status: "unauthenticated" });
      }
    }

    check();
    window.addEventListener("focus", check);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", check);
    };
  }, []);

  return state;
}
