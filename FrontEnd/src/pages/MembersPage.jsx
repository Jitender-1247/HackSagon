import { use, useEffect, useState } from "react";
import { useStore } from "../store/useStore";
import { api } from "../utils/api";
import Sidebar from "../components/Sidebar";

const ROLE_STYLE = {
  admin:  "bg-primary/10 text-primary-lt border-primary/25",
  editor: "bg-accent/10 text-accent border-accent/25",
  viewer: "bg-surface2 text-text3 border-border2",
};

export default function MembersPage() {
  const { activeWorkspace, user , loadWorkspaces } = useStore();
  const [members, setMembers]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [email, setEmail]         = useState("");
  const [role, setRole]           = useState("editor");
  const [inviting, setInviting]   = useState(false);
  const [error, setError]         = useState("");

  const load = () => {
    if (!activeWorkspace) return;
    api(`/workspaces/${activeWorkspace.id}/members`)
      .then((d) => setMembers(d.members))
      .finally(() => setLoading(false));
  };

  useEffect(() => { 
    loadWorkspaces();
    }, []);

  useEffect(() => { load(); }, [activeWorkspace?.id]);

  const invite = async (e) => {
    e.preventDefault();
    setError("");
    setInviting(true);
    try {
      await api(`/workspaces/${activeWorkspace.id}/members`, {
        method: "POST", body: { email, role },
      });
      setEmail("");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const changeRole = async (uid, newRole) => {
    await api(`/workspaces/${activeWorkspace.id}/members/${uid}`, {
      method: "PATCH", body: { role: newRole },
    });
    setMembers((p) => p.map((m) => m.userId === uid ? { ...m, role: newRole } : m));
  };

  const remove = async (uid) => {
    if (!confirm("Remove this member?")) return;
    await api(`/workspaces/${activeWorkspace.id}/members/${uid}`, { method: "DELETE" });
    setMembers((p) => p.filter((m) => m.userId !== uid));
  };

  return (
    <div className="flex h-screen overflow-hidden font-body">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-bg">
        <div className="bg-surface border-b border-border px-8 py-6 sticky top-0 z-10">
          <h1 className="font-display text-xl font-bold text-text">Members</h1>
          <p className="text-text2 text-xs mt-0.5">
            {members.length} members · {members.filter((m) => m.isOnline).length} online
          </p>
        </div>

        <div className="px-8 py-6 max-w-3xl">
          {/* Invite form */}
          <div className="card mb-6">
            <h2 className="font-display font-bold text-sm text-text mb-4">Invite Member</h2>
            <form onSubmit={invite} className="flex flex-wrap gap-2.5 items-end">
              <div className="flex-1 min-w-48">
                <label className="block text-[10px] font-bold text-text3 uppercase tracking-widest mb-1.5">
                  Email address
                </label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="teammate@example.com" required className="input" />
              </div>
              <div className="w-36">
                <label className="block text-[10px] font-bold text-text3 uppercase tracking-widest mb-1.5">
                  Role
                </label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="input">
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button type="submit" disabled={inviting} className="btn-primary shadow-lg shadow-primary/20">
                {inviting ? "Inviting…" : "Send Invite"}
              </button>
            </form>
            {error && <p className="text-danger text-xs mt-2">{error}</p>}
          </div>

          {/* Members list */}
          {loading ? (
            <div className="text-center pt-10 text-text3 text-sm">Loading…</div>
          ) : (
            <div className="space-y-2">
              {members.map((m, i) => {
                const isMe = m.userId === user?.uid;
                return (
                  <div key={m.userId}
                    style={{ animationDelay: `${i * 0.04}s` }}
                    className="card flex items-center gap-3 animate-fade-up">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary to-teal flex items-center justify-center text-sm font-bold text-white">
                        {m.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-surface
                        ${m.isOnline ? "bg-accent" : "bg-text3"}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-text">{m.name}</p>
                        {isMe && <span className="text-[10px] text-text3">(you)</span>}
                      </div>
                      <p className="text-xs text-text3">{m.email}</p>
                    </div>

                    <span className={`text-xs ${m.isOnline ? "text-accent" : "text-text3"}`}>
                      {m.isOnline ? "● Online" : "○ Offline"}
                    </span>

                    {/* Role selector */}
                    {isMe ? (
                      <span className={`badge border ${ROLE_STYLE[m.role] || ROLE_STYLE.viewer}`}>
                        {m.role}
                      </span>
                    ) : (
                      <select value={m.role} onChange={(e) => changeRole(m.userId, e.target.value)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border outline-none cursor-pointer
                          ${ROLE_STYLE[m.role] || ROLE_STYLE.viewer}`}>
                        <option value="viewer">viewer</option>
                        <option value="editor">editor</option>
                        <option value="admin">admin</option>
                      </select>
                    )}

                    {!isMe && (
                      <button onClick={() => remove(m.userId)}
                        className="text-xs border border-danger/25 rounded px-2 py-1 text-danger hover:bg-danger/10 transition-colors">
                        ✕
                      </button>
                    )}
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