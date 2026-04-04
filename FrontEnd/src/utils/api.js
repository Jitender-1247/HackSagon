const API_BASE = import.meta.env.VITE_API_DB_URL; // http://localhost:4000/api/v1

/**
 * Thin fetch wrapper used by all pages.
 * Base URL already includes /api/v1 — do NOT repeat it in paths.
 * Usage:  api("/workspaces/:wid/members")
 *         api("/tasks/:id", { method: "PATCH", body: { status } })
 */
export const api = async (path, options = {}) => {
  const { method = "GET", body, ...rest } = options;

  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    ...rest,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `${method} ${path} failed: ${res.status}`);
  }

  return res.json();
};
