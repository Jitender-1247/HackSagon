import { useEffect, useState } from "react";
import { useStore } from "../store/useStore";
import { api } from "../utils/api";
import Sidebar from "../components/Sidebar";  // fix import path

const COLS = [
  { key: "todo",        label: "To Do",       color: "#3d3d5c" },
  { key: "in_progress", label: "In Progress", color: "#06b6d4" },
  { key: "done",        label: "Done",        color: "#22c55e" },
];

const PRIORITY_STYLE = {
  high:   { background: "#2d0a0a", color: "#ef4444", border: "1px solid #7f1d1d" },
  medium: { background: "#2d1f0a", color: "#f59e0b", border: "1px solid #78350f" },
  low:    { background: "#0a2d1a", color: "#22c55e", border: "1px solid #14532d" },
};

export default function TasksPage() {
  const { activeWorkspace } = useStore();
  const [tasks,    setTasks]    = useState([]);
  const [members,  setMembers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ title: "", priority: "medium", assignedToId: "" });
  const [error,    setError]    = useState("");

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    Promise.all([
      api(`/workspaces/${activeWorkspace.id}/tasks`),
      api(`/workspaces/${activeWorkspace.id}/members`),
    ]).then(([t, m]) => {
      setTasks(t.tasks || []);
      setMembers(m.members || []);
    }).catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [activeWorkspace?.id]);

  const createTask = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      const member = members.find(m => m.userId === form.assignedToId);
      const data = await api(`/workspaces/${activeWorkspace.id}/tasks`, {
        method: "POST",
        body: { ...form, assignedToName: member?.name || "" },
      });
      setTasks(p => [data.task, ...p]);
      setForm({ title: "", priority: "medium", assignedToId: "" });
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      // ← was wrong before: used /workspaces/:wid/tasks/:id
      await api(`/tasks/${id}`, { method: "PATCH", body: { status } });
      setTasks(p => p.map(t => t.id === id ? { ...t, status } : t));
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteTask = async (id) => {
    try {
      // ← was wrong before: used /:wid/tasks/:id
      await api(`/tasks/${id}`, { method: "DELETE" });
      setTasks(p => p.filter(t => t.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const open  = tasks.filter(t => t.status !== "done").length;
  const done  = tasks.filter(t => t.status === "done").length;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#07080f", color: "#c9d1d9", fontFamily: "'Segoe UI', sans-serif" }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: "auto" }}>

        {/* Header */}
        <div style={{ background: "#0b0c18", borderBottom: "1px solid #1a1b2e", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "#f0f0ff", margin: 0 }}>Tasks</h1>
            <p style={{ fontSize: 11, color: "#6060a0", margin: "4px 0 0" }}>{open} open · {done} done</p>
          </div>
          <button
            onClick={() => setShowForm(p => !p)}
            style={{ background: "#6c3fff", border: "none", borderRadius: 8, padding: "8px 16px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            + New Task
          </button>
        </div>

        <div style={{ padding: "24px 32px" }}>

          {error && (
            <div style={{ background: "#2d0a0a", border: "1px solid #7f1d1d", color: "#ef4444", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 12 }}>
              ⚠ {error}
            </div>
          )}

          {/* New task form */}
          {showForm && (
            <form onSubmit={createTask} style={{ background: "#0b0c18", border: "1px solid #2a1f5e", borderRadius: 12, padding: "16px", marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
              <input
                autoFocus
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Task title…"
                required
                style={{ flex: 1, minWidth: 180, background: "#0e0f1e", border: "1px solid #1e1e38", borderRadius: 8, padding: "8px 12px", color: "#c9d1d9", fontSize: 12, outline: "none" }}
              />
              <select
                value={form.priority}
                onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                style={{ background: "#0e0f1e", border: "1px solid #1e1e38", borderRadius: 8, padding: "8px 12px", color: "#c9d1d9", fontSize: 12, outline: "none" }}
              >
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
              <select
                value={form.assignedToId}
                onChange={e => setForm(p => ({ ...p, assignedToId: e.target.value }))}
                style={{ background: "#0e0f1e", border: "1px solid #1e1e38", borderRadius: 8, padding: "8px 12px", color: "#c9d1d9", fontSize: 12, outline: "none" }}
              >
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.userId} value={m.userId}>{m.name}</option>)}
              </select>
              <button type="submit" style={{ background: "#6c3fff", border: "none", borderRadius: 8, padding: "8px 16px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Create
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: "#12122a", border: "none", borderRadius: 8, padding: "8px 16px", color: "#6060a0", fontSize: 12, cursor: "pointer" }}>
                Cancel
              </button>
            </form>
          )}

          {!activeWorkspace && (
            <div style={{ textAlign: "center", paddingTop: 60, color: "#3d3d5c", fontSize: 13 }}>
              Select a workspace from the sidebar to view tasks.
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", paddingTop: 60, color: "#3d3d5c", fontSize: 13 }}>Loading tasks…</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {COLS.map(col => {
                const colTasks = tasks.filter(t => t.status === col.key);
                return (
                  <div key={col.key}>
                    {/* Column header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: col.color }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#c9d1d9" }}>{col.label}</span>
                      <span style={{ fontSize: 10, background: "#12122a", color: "#3d3d5c", borderRadius: 20, padding: "1px 8px", fontWeight: 600 }}>
                        {colTasks.length}
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {colTasks.map(task => (
                        <div key={task.id} style={{ background: "#0b0c18", border: "1px solid #1a1b2e", borderRadius: 10, padding: "12px 14px" }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: "#f0f0ff", margin: "0 0 10px" }}>{task.title}</p>

                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                            <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 20, padding: "2px 8px", ...PRIORITY_STYLE[task.priority] }}>
                              {task.priority}
                            </span>
                            {task.assignedToName && (
                              <div title={task.assignedToName} style={{ width: 24, height: 24, borderRadius: "50%", background: "#6c3fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>
                                {task.assignedToName.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>

                          {/* Move + delete buttons */}
                          <div style={{ display: "flex", gap: 6 }}>
                            {COLS.filter(c => c.key !== col.key).map(c => (
                              <button key={c.key} onClick={() => updateStatus(task.id, c.key)}
                                style={{ flex: 1, fontSize: 9, background: "#12122a", border: "1px solid #1e1e38", borderRadius: 6, padding: "4px 0", color: "#6060a0", cursor: "pointer" }}>
                                → {c.label}
                              </button>
                            ))}
                            <button onClick={() => deleteTask(task.id)}
                              style={{ fontSize: 10, border: "1px solid #7f1d1d", borderRadius: 6, padding: "4px 8px", color: "#ef4444", background: "transparent", cursor: "pointer" }}>
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}

                      {colTasks.length === 0 && (
                        <div style={{ border: "1px dashed #1a1b2e", borderRadius: 10, padding: "24px 0", textAlign: "center", color: "#3d3d5c", fontSize: 11 }}>
                          No tasks
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}