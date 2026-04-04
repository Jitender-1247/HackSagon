import { useEffect } from "react";
import { useStore } from "../store/useStore";
import { api } from "../utils/api";
import Sidebar from "../components/Sidebar";

const TYPE_ICON = {
  task_assigned: "✓",
  doc_updated:   "📄",
  mention:       "@",
  reminder:      "🔔",
};

const TYPE_COLOR = {
  task_assigned: { text: "#22d3a0", bg: "rgba(34,211,160,0.12)",  border: "rgba(34,211,160,0.25)",  dot: "#22d3a0" },
  doc_updated:   { text: "#5ab4f8", bg: "rgba(90,180,248,0.12)",  border: "rgba(90,180,248,0.25)",  dot: "#5ab4f8" },
  mention:       { text: "#a78bfa", bg: "rgba(108,63,255,0.15)",  border: "rgba(108,63,255,0.25)",  dot: "#7c4dff" },
  reminder:      { text: "#f6b44a", bg: "rgba(246,180,74,0.12)",  border: "rgba(246,180,74,0.25)",  dot: "#f6b44a" },
};
const DEFAULT_COLOR = { text: "#52527a", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", dot: "#2a2a42" };

// ── Shared inline style atoms (mirrored from MembersPage) ─────────────────────
const S = {
  pageBg:   { background: "#09090f" },

  headerBg: {
    background:   "linear-gradient(180deg, #0b0c1a 0%, #09090f 100%)",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    padding:      "22px 32px",
    position:     "sticky",
    top: 0, zIndex: 10,
  },

  sectionLabel: {
    fontSize: 9, fontWeight: 700, color: "#3a3a58",
    letterSpacing: "0.14em", textTransform: "uppercase",
  },

  card: {
    background:   "linear-gradient(135deg, rgba(108,63,255,0.07) 0%, rgba(108,63,255,0.02) 100%)",
    border:       "1px solid rgba(108,63,255,0.18)",
    borderRadius: 14,
    padding:      "20px 22px",
    marginBottom: 22,
  },

  heading:   { fontSize: 20, fontWeight: 700, color: "#f0f0ff", letterSpacing: "-0.4px" },
  bodyText:  { fontSize: 13, fontWeight: 600, color: "#d4d4f0" },
  subText:   { fontSize: 11, color: "#3a3a5a" },
  mutedText: { fontSize: 12, color: "#52527a" },
  colHead:   { fontSize: 9,  fontWeight: 700, color: "#3a3a58", letterSpacing: "0.12em", textTransform: "uppercase" },
};

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
    <>
      {/* ── Scoped styles ──────────────────────────────────────────────── */}
      <style>{`
        .np * { font-family: 'Inter', -apple-system, sans-serif; box-sizing: border-box; }

        /* Notification row hover */
        .np-row {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px;
          padding: 13px 16px;
          display: flex;
          align-items: center;
          gap: 14px;
          transition: all 0.18s cubic-bezier(0.4,0,0.2,1);
          position: relative;
        }
        .np-row:hover {
          background: rgba(108,63,255,0.05);
          border-color: rgba(108,63,255,0.2);
          box-shadow: 0 4px 22px rgba(0,0,0,0.3);
          transform: translateY(-1px);
        }
        .np-row.np-unread {
          background: rgba(108,63,255,0.04);
          border-color: rgba(108,63,255,0.2);
        }
        .np-row.np-unread:hover {
          background: rgba(108,63,255,0.09);
          border-color: rgba(108,63,255,0.32);
        }

        /* Mark read btn */
        .np-read-btn {
          font-size: 10px; font-weight: 600;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 7px; padding: 4px 10px;
          color: #52527a; background: transparent;
          cursor: pointer; font-family: inherit;
          transition: all 0.15s; white-space: nowrap;
        }
        .np-read-btn:hover {
          background: rgba(34,211,160,0.08);
          border-color: rgba(34,211,160,0.25);
          color: #22d3a0;
        }

        /* Remove btn */
        .np-rm {
          opacity: 0;
          width: 28px; height: 28px;
          border-radius: 8px;
          border: 1px solid transparent;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; color: #52527a;
          background: transparent; cursor: pointer;
          transition: opacity 0.15s, background 0.15s, color 0.15s, border-color 0.15s;
          flex-shrink: 0;
        }
        .np-row:hover .np-rm { opacity: 1; }
        .np-rm:hover {
          background: rgba(243,107,107,0.12) !important;
          border-color: rgba(243,107,107,0.25) !important;
          color: #f36b6b !important;
        }

        /* Mark-all btn */
        .np-mark-all {
          background: rgba(108,63,255,0.12);
          border: 1px solid rgba(108,63,255,0.25);
          color: #a78bfa; border-radius: 9px;
          padding: 7px 16px; font-size: 12px; font-weight: 600;
          font-family: inherit; cursor: pointer;
          transition: opacity 0.18s, transform 0.18s, box-shadow 0.18s;
        }
        .np-mark-all:hover {
          opacity: 0.85; transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(108,63,255,0.2);
        }

        /* Unread dot pulse */
        @keyframes np-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(108,63,255,0.55); }
          60%      { box-shadow: 0 0 0 5px rgba(108,63,255,0); }
        }
        .np-dot-pulse { animation: np-pulse 2.2s ease-in-out infinite; }

        /* Skeleton */
        @keyframes np-skel { 0%,100%{opacity:.35} 50%{opacity:.7} }
        .np-skel { animation: np-skel 1.6s ease-in-out infinite; }

        /* Fade up */
        @keyframes np-fu { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:none} }
        .np-fu { animation: np-fu 0.28s ease both; }
      `}</style>

      <div className="np" style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <Sidebar />

        <main style={{ flex: 1, overflowY: "auto", ...S.pageBg }}>

          {/* ── Header ─────────────────────────────────────────── */}
          <div style={S.headerBg}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h1 style={S.heading}>Notifications</h1>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 5 }}>
                  <span style={S.mutedText}>{notifications.length} total</span>
                  {unread > 0 && (
                    <>
                      <span style={{ color: "#2a2a42" }}>·</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#a78bfa" }}>
                        <span className="np-dot-pulse" style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: "#7c4dff", display: "inline-block",
                        }} />
                        {unread} unread
                      </span>
                    </>
                  )}
                </div>
              </div>

              {unread > 0 && (
                <button onClick={markAllRead} className="np-mark-all">
                  ✓ Mark all read
                </button>
              )}
            </div>
          </div>

          {/* ── Content ────────────────────────────────────────── */}
          <div style={{ padding: "24px 32px", maxWidth: 860 }}>

            {notifications.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🔔</div>
                <p style={S.mutedText}>You're all caught up!</p>
              </div>

            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>

                {/* Column headers */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 16px 6px" }}>
                  <div style={{ width: 32 }} />
                  <p style={{ ...S.colHead, flex: 1 }}>Notification</p>
                  <p style={{ ...S.colHead, width: 120, textAlign: "center" }}>Time</p>
                  <p style={{ ...S.colHead, width: 80,  textAlign: "center" }}>Type</p>
                  <div style={{ width: 90 }} />
                </div>

                {notifications.map((n, i) => {
                  const tc = TYPE_COLOR[n.type] || DEFAULT_COLOR;

                  return (
                    <div
                      key={n.id}
                      className={`np-row np-fu${!n.isRead ? " np-unread" : ""}`}
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      {/* Type icon */}
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                        background: tc.bg, border: `1px solid ${tc.border}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700, color: tc.text,
                        boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
                      }}>
                        {TYPE_ICON[n.type] || "🔔"}
                      </div>

                      {/* Message */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          ...S.bodyText,
                          fontWeight: n.isRead ? 400 : 600,
                          color: n.isRead ? "#52527a" : "#d4d4f0",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {n.message}
                        </p>
                        <p style={{ ...S.subText, marginTop: 2 }}>
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>

                      {/* Time — hidden, already in subText; kept as spacer col */}
                      <div style={{ width: 120 }} />

                      {/* Type badge */}
                      <div style={{ width: 80, display: "flex", justifyContent: "center" }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600,
                          padding: "3px 10px", borderRadius: 20,
                          border: `1px solid ${tc.border}`,
                          color: tc.text, background: tc.bg,
                          textTransform: "capitalize", whiteSpace: "nowrap",
                        }}>
                          {(n.type || "general").replace("_", " ")}
                        </span>
                      </div>

                      {/* Actions */}
                      <div style={{ width: 90, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                        {!n.isRead && (
                          <button onClick={() => markOne(n.id)} className="np-read-btn">✓ Read</button>
                        )}
                        <button
                          onClick={() => remove(n.id)}
                          title="Remove notification"
                          className="np-rm"
                        >✕</button>
                      </div>

                      {/* Unread indicator strip */}
                      {!n.isRead && (
                        <div style={{
                          position: "absolute", left: 0, top: "20%", bottom: "20%",
                          width: 3, borderRadius: "0 2px 2px 0",
                          background: "linear-gradient(180deg, #7c4dff, #a78bfa)",
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer summary */}
            {notifications.length > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 20,
                marginTop: 20, paddingTop: 16,
                borderTop: "1px solid rgba(255,255,255,0.04)",
              }}>
                {Object.entries(TYPE_COLOR).map(([type, tc]) => {
                  const count = notifications.filter((n) => n.type === type).length;
                  if (!count) return null;
                  return (
                    <div key={type} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: tc.dot, display: "inline-block" }} />
                      <span style={S.mutedText}>{count} {type.replace("_", " ")}</span>
                    </div>
                  );
                })}
                {unread > 0 && (
                  <>
                    <span style={{ color: "#2a2a42" }}>·</span>
                    <span style={{ ...S.mutedText, color: "#a78bfa" }}>{unread} unread</span>
                  </>
                )}
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  );
}