import { create } from "zustand";

const API_BASE = import.meta.env.VITE_API_DB_URL;

const getToken = () => localStorage.getItem("token");

const apiFetch = async (path, options = {}) => {
  const { body, method = "GET", ...rest } = options;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    ...rest,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
};

export const useStore = create((set, get) => ({
  // ── Auth / user ──────────────────────────────────────────────────────────
  user: null,
  setUser: (user) => set({ user }),

  // ── Active workspace ─────────────────────────────────────────────────────
  activeWorkspace: null,
  workspaces: [],

  setActiveWorkspace: (ws) => set({ activeWorkspace: ws }),

  loadWorkspaces: async () => {
    try {
      const data = await apiFetch("/workspaces");
      const workspaces = data.workspaces || [];
      set({
        workspaces,
        activeWorkspace: get().activeWorkspace ?? workspaces[0] ?? null,
      });
    } catch (err) {
      console.error("[store] loadWorkspaces:", err.message);
    }
  },

  // ── Notifications ────────────────────────────────────────────────────────
  notifications: [],

  loadNotifications: async () => {
    try {
      const data = await apiFetch("/notifications");
      set({ notifications: data.notifications || [] });
    } catch (err) {
      console.error("[store] loadNotifications:", err.message);
    }
  },

  markAllRead: async () => {
    try {
      await apiFetch("/notifications/read-all", { method: "PATCH" });
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      }));
    } catch (err) {
      console.error("[store] markAllRead:", err.message);
    }
  },
}));