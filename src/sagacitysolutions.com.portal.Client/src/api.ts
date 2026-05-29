/**
 * Thin wrapper around the BFF API.
 * All auth state lives in the BFF session cookie — no tokens in the browser.
 */

const BFF_ORIGIN = import.meta.env.VITE_BFF_ORIGIN ?? "http://localhost:5000";

export interface UserClaims {
  username: string;
  organizations: Record<string, string>;
  portal_project_ids: string[];
  scope?: string;
}

export async function fetchApi(url: string, options?: RequestInit) {
  const res = await fetch(`${BFF_ORIGIN}/api/${url}`, { ...options, credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`/api/${url} failed: ${res.status}`);
  
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/** Fetch the current user from the BFF. Returns null when not authenticated. */
export async function fetchMe() {
  const res = await fetch(`${BFF_ORIGIN}/me`, { credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`/me failed: ${res.status}`);
  return res.json();
}

/** Navigate the top-level window to the BFF login route. */
export function login() {
  window.location.href = `${BFF_ORIGIN}/auth/login`;
}

/** Navigate the top-level window to the BFF logout route. */
export function logout() {
  window.location.href = `${BFF_ORIGIN}/auth/logout`;
}
