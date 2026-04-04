import { useEffect } from "react";
import { useStore } from "../store/useStore";
import { api } from "../utils/api";
import Sidebar from "../components/Sidebar";

const TYPE_ICON = { task_assigned: "✓", doc_updated: "📄", mention: "@", reminder: "🔔" };

export default function NotificationsPage() {
  const { notifications, loadNotifications, markAllRead } = useStore();

  useEffect(() => { loadNotifications(); }, []);

  const markOne = async (id) => {
    await api(`/notifications/${id}/read`, { method: "PATCH" });
    loadNotifications();
  };

  const remove = async (id) => {
    await api(`/notifications/${id}`, { method: "DELETE" });
    loadNotifications();
  };

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="flex h-screen overflow-hidden font-body">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-bg">
        <div className="bg-surface border-b border-border px-8 py-6 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="font-display text-xl font-bold text-text">Notifications</h1>
            <p className="text-text2 text-xs mt-0.5">{unread} unread</p>
          </div>
          {unread > 0 && (
            <button onClick={markAllRead} className="btn-ghost text-xs">Mark all read</button>
          )}
        </div>

        <div className="px-8 py-6 max-w-2xl">
          {notifications.length === 0 ? (
            <div className="text-center pt-16">
              <div className="text-5xl mb-3">🔔</div>
              <p className="text-text2 text-sm">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n, i) => (
                <div key={n.id}
                  style={{ animationDelay: `${i * 0.03}s` }}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-all animate-fade-up
                    ${n.isRead
                      ? "bg-surface border-border"
                      : "bg-primary/5 border-primary/25"
                    }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0
                    ${n.isRead ? "bg-surface2" : "bg-primary/20"}`}>
                    {TYPE_ICON[n.type] || "🔔"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${n.isRead ? "text-text2 font-normal" : "text-text font-medium"}`}>
                      {n.message}
                    </p>
                    <p className="text-[11px] text-text3 mt-0.5">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {!n.isRead && (
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  )}

                  <div className="flex items-center gap-1.5">
                    {!n.isRead && (
                      <button onClick={() => markOne(n.id)}
                        className="text-[10px] border border-border2 rounded px-2 py-1 text-text3 hover:text-text transition-colors">
                        ✓ Read
                      </button>
                    )}
                    <button onClick={() => remove(n.id)}
                      className="text-[10px] border border-danger/25 rounded px-2 py-1 text-danger hover:bg-danger/10 transition-colors">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}