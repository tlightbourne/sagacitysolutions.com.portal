/**
 * Thin wrapper around the BFF API.
 * All auth state lives in the BFF session cookie — no tokens in the browser.
 */

const BFF_ORIGIN = import.meta.env.VITE_BFF_ORIGIN ?? "http://localhost:5000";

export interface UserClaims {
  sub: string;
  name?: string;
  username?: string;
  email?: string;
  picture?: string;
}

/** Fetch the current user from the BFF. Returns null when not authenticated. */
export async function fetchMe(): Promise<UserClaims | null> {
  const res = await fetch(`${BFF_ORIGIN}/api/me`, { credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`/api/me failed: ${res.status}`);
  return res.json() as Promise<UserClaims>;
}

/** Navigate the top-level window to the BFF login route. */
export function login() {
  window.location.href = `${BFF_ORIGIN}/auth/login`;
}

/** Navigate the top-level window to the BFF logout route. */
export function logout() {
  window.location.href = `${BFF_ORIGIN}/auth/logout`;
}
