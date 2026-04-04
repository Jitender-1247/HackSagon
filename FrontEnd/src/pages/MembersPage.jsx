import { useEffect, useState } from "react";
import { useStore } from "../store/useStore";
import { api } from "../utils/api";
import Sidebar from "../components/Sidebar";

const ROLE_COLOR = {
  admin:  { text: "#a78bfa", bg: "rgba(108,63,255,0.15)", border: "rgba(108,63,255,0.25)", dot: "#7c4dff"  },
  editor: { text: "#22d3a0", bg: "rgba(34,211,160,0.12)",  border: "rgba(34,211,160,0.25)",  dot: "#22d3a0" },
  viewer: { text: "#52527a", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", dot: "#2a2a42" },
};

const ROLE_DESC = {
  admin:  "Full control",
  editor: "Can edit docs",
  viewer: "Read only",
};

const AVATAR_GRADS = [
  ["#7c4dff", "#a78bfa"],
  ["#22d3a0", "#2dd4bf"],
  ["#f6b44a", "#f59e0b"],
  ["#5ab4f8", "#3b82f6"],
  ["#f36b6b", "#ec4899"],
];

// ── Shared inline style atoms ─────────────────────────────────────────────────
const S = {
  // Page bg — exact match to Sidebar's gradient base
  pageBg:   { background: "#09090f" },

  // Header — same as Sidebar's top gradient
  headerBg: {
    background:   "linear-gradient(180deg, #0b0c1a 0%, #09090f 100%)",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    padding:      "22px 32px",
    position:     "sticky",
    top: 0, zIndex: 10,
  },

  // Section label (reused from Sidebar's uppercase labels)
  sectionLabel: {
    fontSize: 9, fontWeight: 700, color: "#3a3a58",
    letterSpacing: "0.14em", textTransform: "uppercase",
  },

  // Card — same subtle glass as Sidebar panels
  card: {
    background:   "linear-gradient(135deg, rgba(108,63,255,0.07) 0%, rgba(108,63,255,0.02) 100%)",
    border:       "1px solid rgba(108,63,255,0.18)",
    borderRadius: 14,
    padding:      "20px 22px",
    marginBottom: 22,
  },

  // Member row
  row: {
    background:   "rgba(255,255,255,0.02)",
    border:       "1px solid rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding:      "13px 16px",
    display:      "flex",
    alignItems:   "center",
    gap:          14,
  },

  // Text
  heading:  { fontSize: 20, fontWeight: 700, color: "#f0f0ff", letterSpacing: "-0.4px" },
  bodyText: { fontSize: 13, fontWeight: 600, color: "#d4d4f0" },
  subText:  { fontSize: 11, color: "#3a3a5a" },
  mutedText:{ fontSize: 12, color: "#52527a" },
  colHead:  { fontSize: 9,  fontWeight: 700, color: "#3a3a58", letterSpacing: "0.12em", textTransform: "uppercase" },
};

export default function MembersPage() {
  const { activeWorkspace, user, loadWorkspaces } = useStore();
  const [members, setMembers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [email, setEmail]       = useState("");
  const [role, setRole]         = useState("editor");
  const [inviting, setInviting] = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [search, setSearch]     = useState("");

  const load = () => {
    if (!activeWorkspace) return;
    setLoading(true);
    api(`/workspaces/${activeWorkspace.id}/members`)
      .then((d) => setMembers(d.members || []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadWorkspaces(); }, []);
  useEffect(() => { load(); }, [activeWorkspace?.id]);

  const invite = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    setInviting(true);
    const sent = email;
    try {
      await api(`/workspaces/${activeWorkspace.id}/members`, {
        method: "POST", body: { email, role },
      });
      setEmail("");
      setSuccess(`Invite sent to ${sent}`);
      load();
      setTimeout(() => setSuccess(""), 3500);
    } catch (err) {
      setError(err.message || "Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  const changeRole = async (uid, newRole) => {
    try {
      await api(`/workspaces/${activeWorkspace.id}/members/${uid}`, {
        method: "PATCH", body: { role: newRole },
      });
      setMembers((p) => p.map((m) => m.userId === uid ? { ...m, role: newRole } : m));
    } catch {
      setError("Failed to update role");
    }
  };

  const remove = async (uid, name) => {
    if (!confirm(`Remove ${name} from this workspace?`)) return;
    try {
      await api(`/workspaces/${activeWorkspace.id}/members/${uid}`, { method: "DELETE" });
      setMembers((p) => p.filter((m) => m.userId !== uid));
    } catch {
      setError("Failed to remove member");
    }
  };

  const filtered = members.filter((m) =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  );
  const onlineCount = members.filter((m) => m.isOnline).length;

  return (
    <>
      {/* ── Scoped styles ──────────────────────────────────────────────── */}
      <style>{`
        .mp * { font-family: 'Inter', -apple-system, sans-serif; box-sizing: border-box; }

        /* Input */
        .mp-input {
          width: 100%; padding: 9px 13px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 9px; color: #d4d4f0; font-size: 13px;
          outline: none; transition: border-color 0.18s, box-shadow 0.18s;
          font-family: inherit;
        }
        .mp-input::placeholder { color: #3a3a5a; }
        .mp-input:focus {
          border-color: rgba(108,63,255,0.45);
          box-shadow: 0 0 0 3px rgba(108,63,255,0.08);
        }
        select.mp-input { cursor: pointer; }
        select.mp-input option { background: #0f0f1e; color: #d4d4f0; }

        /* Role select inside row */
        .mp-role-sel {
          border-radius: 20px; padding: 3px 10px; font-size: 11px;
          font-weight: 600; outline: none; cursor: pointer;
          font-family: inherit; transition: opacity 0.15s;
          border: 1px solid;
        }
        .mp-role-sel option { background: #0f0f1e; color: #d4d4f0; }
        .mp-role-sel:hover { opacity: 0.75; }

        /* Primary btn */
        .mp-btn {
          background: linear-gradient(135deg, #7c4dff, #6c3fff);
          color: #fff; border: none; border-radius: 9px;
          padding: 9px 20px; font-size: 13px; font-weight: 600;
          font-family: inherit; cursor: pointer;
          display: flex; align-items: center; gap: 7px;
          transition: opacity 0.18s, transform 0.18s, box-shadow 0.18s;
          box-shadow: 0 4px 16px rgba(108,63,255,0.3);
          white-space: nowrap; height: 40px;
        }
        .mp-btn:hover:not(:disabled) {
          opacity: 0.9; transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(108,63,255,0.42);
        }
        .mp-btn:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }

        /* Member row hover */
        .mp-row {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px; padding: 13px 16px;
          display: flex; align-items: center; gap: 14px;
          transition: all 0.18s cubic-bezier(0.4,0,0.2,1);
        }
        .mp-row:hover {
          background: rgba(108,63,255,0.05);
          border-color: rgba(108,63,255,0.2);
          box-shadow: 0 4px 22px rgba(0,0,0,0.3);
          transform: translateY(-1px);
        }

        /* Remove btn */
        .mp-rm {
          opacity: 0; width: 28px; height: 28px;
          border-radius: 8px; border: 1px solid transparent;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; color: #52527a;
          background: transparent; cursor: pointer;
          transition: opacity 0.15s, background 0.15s, color 0.15s, border-color 0.15s;
        }
        .mp-row:hover .mp-rm { opacity: 1; }
        .mp-rm:hover {
          background: rgba(243,107,107,0.12) !important;
          border-color: rgba(243,107,107,0.25) !important;
          color: #f36b6b !important;
        }

        /* Spinner */
        @keyframes mp-spin { to { transform: rotate(360deg); } }
        .mp-spin {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff; border-radius: 50%;
          animation: mp-spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        /* Skeleton */
        @keyframes mp-skel { 0%,100%{opacity:.35} 50%{opacity:.7} }
        .mp-skel { animation: mp-skel 1.6s ease-in-out infinite; }

        /* Fade up */
        @keyframes mp-fu { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:none} }
        .mp-fu { animation: mp-fu 0.28s ease both; }

        /* Online pulse */
        @keyframes mp-op {
          0%,100% { box-shadow: 0 0 0 0 rgba(34,211,160,0.55); }
          60%      { box-shadow: 0 0 0 5px rgba(34,211,160,0); }
        }
        .mp-online { animation: mp-op 2.2s ease-in-out infinite; }

        /* Search icon tweak */
        .mp-search-wrap { position: relative; }
        .mp-search-icon {
          position: absolute; left: 11px; top: 50%;
          transform: translateY(-50%);
          font-size: 13px; color: #3a3a58; pointer-events: none;
        }
        .mp-search-wrap .mp-input { padding-left: 34px; width: 210px; }
      `}</style>

      <div className="mp" style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <Sidebar />

        <main style={{ flex: 1, overflowY: "auto", ...S.pageBg }}>

          {/* ── Header ─────────────────────────────────────────── */}
          <div style={S.headerBg}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h1 style={S.heading}>Team Members</h1>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 5 }}>
                  <span style={S.mutedText}>{members.length} member{members.length !== 1 ? "s" : ""}</span>
                  <span style={{ color: "#2a2a42" }}>·</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#22d3a0" }}>
                    <span className="mp-online" style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "#22d3a0", display: "inline-block",
                    }} />
                    {onlineCount} online
                  </span>
                </div>
              </div>

              {/* Search */}
              <div className="mp-search-wrap">
                <span className="mp-search-icon">🔍</span>
                <input
                  className="mp-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search members…"
                />
              </div>
            </div>
          </div>

          {/* ── Content ────────────────────────────────────────── */}
          <div style={{ padding: "24px 32px", maxWidth: 860 }}>

            {/* Invite card */}
            <div style={S.card}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 9,
                  background: "rgba(108,63,255,0.15)",
                  border: "1px solid rgba(108,63,255,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                }}>✉️</div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#d4d4f0" }}>Invite a Member</span>
              </div>

              <form onSubmit={invite} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <label style={{ ...S.sectionLabel, display: "block", marginBottom: 6 }}>Email address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="teammate@example.com" required className="mp-input" />
                </div>

                <div style={{ width: 148 }}>
                  <label style={{ ...S.sectionLabel, display: "block", marginBottom: 6 }}>Role</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} className="mp-input">
                    <option value="editor">✏️ Editor</option>
                    <option value="viewer">👁 Viewer</option>
                    <option value="admin">⚡ Admin</option>
                  </select>
                </div>

                <button type="submit" disabled={inviting || !email} className="mp-btn">
                  {inviting ? <><span className="mp-spin" />Inviting…</> : "Send Invite"}
                </button>
              </form>

              {error && (
                <div style={{
                  marginTop: 12, padding: "8px 12px", borderRadius: 8,
                  background: "rgba(243,107,107,0.08)", border: "1px solid rgba(243,107,107,0.2)",
                  display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#f36b6b",
                }}>⚠ {error}</div>
              )}
              {success && (
                <div style={{
                  marginTop: 12, padding: "8px 12px", borderRadius: 8,
                  background: "rgba(34,211,160,0.08)", border: "1px solid rgba(34,211,160,0.2)",
                  display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#22d3a0",
                }}>✓ {success}</div>
              )}

              {/* Role legend */}
              <div style={{
                marginTop: 14, paddingTop: 12,
                borderTop: "1px solid rgba(255,255,255,0.04)",
                display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap",
              }}>
                <span style={S.sectionLabel}>Roles:</span>
                {Object.entries(ROLE_DESC).map(([r, desc]) => (
                  <div key={r} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: ROLE_COLOR[r].dot, display: "inline-block",
                    }} />
                    <span style={{ fontSize: 11, color: "#8888aa", fontWeight: 500, textTransform: "capitalize" }}>{r}</span>
                    <span style={{ fontSize: 11, color: "#3a3a58" }}>— {desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Members list */}
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[0, 1, 2].map((n) => (
                  <div key={n} className="mp-skel" style={{
                    ...S.row, gap: 14,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                      <div style={{ height: 11, background: "rgba(255,255,255,0.05)", borderRadius: 6, width: "30%" }} />
                      <div style={{ height: 9,  background: "rgba(255,255,255,0.03)", borderRadius: 6, width: "50%" }} />
                    </div>
                    <div style={{ height: 22, width: 55, background: "rgba(255,255,255,0.04)", borderRadius: 20 }} />
                    <div style={{ height: 22, width: 68, background: "rgba(255,255,255,0.04)", borderRadius: 20 }} />
                  </div>
                ))}
              </div>

            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>👥</div>
                <p style={S.mutedText}>
                  {search ? "No members match your search" : "No members yet — invite your first teammate!"}
                </p>
              </div>

            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {/* Column headers */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 16px 6px" }}>
                  <div style={{ width: 40 }} />
                  <p style={{ ...S.colHead, flex: 1 }}>Member</p>
                  <p style={{ ...S.colHead, width: 80, textAlign: "center" }}>Status</p>
                  <p style={{ ...S.colHead, width: 110, textAlign: "center" }}>Role</p>
                  <div style={{ width: 28 }} />
                </div>

                {filtered.map((m, i) => {
                  const isMe  = m.userId === user?.uid;
                  const rc    = ROLE_COLOR[m.role] || ROLE_COLOR.viewer;
                  const [c1, c2] = AVATAR_GRADS[i % AVATAR_GRADS.length];

                  return (
                    <div
                      key={m.userId}
                      className="mp-row mp-fu"
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      {/* Avatar */}
                      <div style={{ position: "relative", flexShrink: 0 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: "50%",
                          background: `linear-gradient(135deg, ${c1}, ${c2})`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, fontWeight: 700, color: "#fff",
                          boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
                        }}>
                          {m.name?.slice(0, 2).toUpperCase() || "??"}
                        </div>
                        <div style={{
                          position: "absolute", bottom: -1, right: -1,
                          width: 11, height: 11, borderRadius: "50%",
                          border: "2px solid #09090f",
                          background: m.isOnline ? "#22d3a0" : "#2a2a42",
                          transition: "background 0.3s",
                        }} />
                      </div>

                      {/* Name / email */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <p style={{ ...S.bodyText, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {m.name}
                          </p>
                          {isMe && (
                            <span style={{
                              fontSize: 9, fontWeight: 700, color: "#a78bfa",
                              background: "rgba(108,63,255,0.15)",
                              border: "1px solid rgba(108,63,255,0.25)",
                              borderRadius: 20, padding: "1px 7px", flexShrink: 0,
                            }}>YOU</span>
                          )}
                        </div>
                        <p style={{ ...S.subText, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {m.email}
                        </p>
                      </div>

                      {/* Status */}
                      <div style={{ width: 80, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                        <span style={{
                          width: 5, height: 5, borderRadius: "50%",
                          background: m.isOnline ? "#22d3a0" : "#2a2a42",
                          display: "inline-block", flexShrink: 0,
                        }} />
                        <span style={{ fontSize: 11, fontWeight: 500, color: m.isOnline ? "#22d3a0" : "#3a3a5a" }}>
                          {m.isOnline ? "Online" : "Offline"}
                        </span>
                      </div>

                      {/* Role */}
                      <div style={{ width: 110, display: "flex", justifyContent: "center" }}>
                        {isMe ? (
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: "3px 12px",
                            borderRadius: 20, border: "1px solid",
                            color: rc.text, background: rc.bg, borderColor: rc.border,
                            textTransform: "capitalize",
                          }}>{m.role}</span>
                        ) : (
                          <select
                            value={m.role}
                            onChange={(e) => changeRole(m.userId, e.target.value)}
                            className="mp-role-sel"
                            style={{ color: rc.text, backgroundColor: rc.bg, borderColor: rc.border }}
                          >
                            <option value="viewer">viewer</option>
                            <option value="editor">editor</option>
                            <option value="admin">admin</option>
                          </select>
                        )}
                      </div>

                      {/* Remove */}
                      <div style={{ width: 28, display: "flex", justifyContent: "center" }}>
                        {!isMe && (
                          <button
                            onClick={() => remove(m.userId, m.name)}
                            title={`Remove ${m.name}`}
                            className="mp-rm"
                          >✕</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer summary */}
            {!loading && members.length > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 20,
                marginTop: 20, paddingTop: 16,
                borderTop: "1px solid rgba(255,255,255,0.04)",
              }}>
                {Object.entries(ROLE_COLOR).map(([r, rc]) => {
                  const count = members.filter((m) => m.role === r).length;
                  if (!count) return null;
                  return (
                    <div key={r} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: rc.dot, display: "inline-block" }} />
                      <span style={S.mutedText}>{count} {r}{count !== 1 ? "s" : ""}</span>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  );
}
