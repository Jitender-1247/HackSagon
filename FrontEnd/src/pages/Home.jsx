import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import Logo from '../assets/inksync_logo.svg';

const API_BASE = import.meta.env.VITE_API_AI_URL;

const decodeJwt = (token) => {
  try { return JSON.parse(atob(token.split(".")[1])); }
  catch { return {}; }
};

const NAV_ITEMS = [
  { path: '/dashboard',     icon: 'grid',   label: 'Dashboard'     },
  { path: '/members',       icon: 'users',  label: 'Members'       },
  { path: '/tasks',         icon: 'check',  label: 'Tasks'         },
  { path: '/notifications', icon: 'bell',   label: 'Notifications' },
];

const NavIcons = {
  grid: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  users: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  check: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  bell: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
};

const FileIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);

const CodeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const ClockIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

const ArrowIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

export default function Home() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { workspaces, activeWorkspace, setActiveWorkspace, loadWorkspaces, notifications } = useStore();
  const [docs,    setDocs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const token = localStorage.getItem("token");
  const me    = decodeJwt(token); // { uid, email } — add name to JWT for full name

  // Prefer stored name (set on login/register) over JWT email
  const userName  = localStorage.getItem("name") || me?.email || "User";
  const userEmail = me?.email || "";
  const userInitial = userName.charAt(0).toUpperCase();

  const unread = (notifications || []).filter(n => !n.isRead).length;

  useEffect(() => { if (token) loadWorkspaces(); }, [token]);

  const fetchDocs = useCallback(async () => {
    if (!activeWorkspace?.id) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `${API_BASE}/api/v1/workspaces/${activeWorkspace.id}/docs`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Could not fetch documents");
      const data = await res.json();
      setDocs(data.docs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, token]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleCreateDoc = async (type = 'document') => {
    if (!activeWorkspace?.id) { alert("No workspace selected."); return; }
    const title = prompt("Enter document title:", "New Project Draft");
    if (!title) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/workspaces/${activeWorkspace.id}/docs`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title, type, language: type === 'code' ? 'javascript' : null }),
        }
      );
      if (!res.ok) throw new Error("Failed to create document");
      const { doc } = await res.json();
      if (doc?.id) navigate(`/editor/${doc.id}`);
    } catch (err) {
      alert("Failed to create document: " + err.message);
    }
  };

  const handleCreateWorkspace = async () => {
    const name = prompt("Workspace name:");
    if (!name) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/workspaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create workspace");
      await loadWorkspaces();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/v1/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: localStorage.getItem("uid") }),
      });
    } catch {}
    localStorage.clear();
    navigate("/login");
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateStr) => {
    const d    = new Date(dateStr);
    const now  = new Date();
    const days = Math.floor((now - d) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7)  return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };


  return (
    <div style={{ display: 'flex', height: '100vh', background: '#07080f', color: '#c9d1d9', fontFamily: "'Inter', -apple-system, sans-serif", overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .cl-sidebar-inner { scrollbar-width: thin; scrollbar-color: #1a1b2e transparent; }
        .cl-doc-card { transition: all 0.22s cubic-bezier(0.4,0,0.2,1); cursor: pointer; }
        .cl-doc-card:hover { border-color: rgba(108,63,255,0.5) !important; transform: translateY(-2px); box-shadow: 0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(108,63,255,0.15) !important; }
        .cl-doc-card:hover .card-title { color: #a78bfa !important; }
        .cl-doc-card:hover .card-arrow { opacity: 1 !important; transform: translateX(3px) !important; }
        .cl-quick-btn { transition: all 0.18s; }
        .cl-quick-btn:hover { transform: translateY(-1px); }
        .cl-ws-create:hover { color: #a78bfa !important; }
        .cl-main { scrollbar-width: thin; scrollbar-color: #1a1b2e transparent; }
        .cl-sidebar-ws-btn { transition: all 0.15s; }
        .cl-sidebar-ws-btn:hover { background: rgba(108,63,255,0.07) !important; color: #c4b5fd !important; }
        .cl-nav-btn { transition: all 0.18s cubic-bezier(0.4,0,0.2,1); }
        .cl-nav-btn:hover { background: rgba(108,63,255,0.08) !important; color: #c4b5fd !important; }
        .cl-nav-btn.active { background: linear-gradient(135deg, rgba(108,63,255,0.18), rgba(108,63,255,0.08)) !important; color: #a78bfa !important; border-right: 2px solid #6c3fff !important; }
        .cl-create-btn { transition: all 0.18s; }
        .cl-create-btn:hover { background: rgba(255,255,255,0.04) !important; transform: translateX(2px); }
        .cl-logout-btn { transition: all 0.18s; }
        .cl-logout-btn:hover { background: rgba(239,68,68,0.1) !important; border-color: rgba(239,68,68,0.4) !important; color: #ef4444 !important; }
      `}</style>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="cl-sidebar-inner" style={{
        width: 240,
        background: 'linear-gradient(180deg, #09090f 0%, #0b0c1a 100%)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        overflowY: 'auto', position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: -60, left: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(108,63,255,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div>
          <img src={Logo} onClick={() => navigate('/dashboard')} alt="Inksync Logo" style={{ width: 200, margin: 8, cursor: 'pointer' }} />
        </div>

        {/* Workspace switcher */}
        <div style={{ padding: '14px 12px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
          <div style={{ fontSize: 9, color: '#3a3a58', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 6 }}>
            Workspace
          </div>
          {workspaces.length === 0 ? (
            <button onClick={handleCreateWorkspace} className="cl-ws-create" style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8, border: '1px dashed rgba(108,63,255,0.25)', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: 'rgba(108,63,255,0.05)', color: '#6060a0', display: 'flex', alignItems: 'center', gap: 7, transition: 'all 0.15s' }}>
              <PlusIcon /> Create your first workspace
            </button>
          ) : (
            <>
              {workspaces.map((ws) => (
                <button key={ws.id} onClick={() => setActiveWorkspace(ws)} className="cl-sidebar-ws-btn" style={{ width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: activeWorkspace?.id === ws.id ? 'rgba(108,63,255,0.14)' : 'transparent', color: activeWorkspace?.id === ws.id ? '#a78bfa' : '#52527a', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: activeWorkspace?.id === ws.id ? '#7c4dff' : '#252540', boxShadow: activeWorkspace?.id === ws.id ? '0 0 6px rgba(108,63,255,0.7)' : 'none', transition: 'all 0.2s' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{ws.name}</span>
                </button>
              ))}
              <button onClick={handleCreateWorkspace} className="cl-ws-create" style={{ width: '100%', textAlign: 'left', padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, background: 'transparent', color: '#3a3a58', display: 'flex', alignItems: 'center', gap: 7, marginTop: 4, transition: 'all 0.15s' }}>
                <PlusIcon /> New workspace
              </button>
            </>
          )}
        </div>

        {/* Nav */}
        <div style={{ padding: '14px 10px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
          <div style={{ fontSize: 9, color: '#3a3a58', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 8 }}>Navigate</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button key={item.path} onClick={() => navigate(item.path)} className={`cl-nav-btn${isActive ? ' active' : ''}`} style={{ width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 9, border: 'none', borderRight: isActive ? '2px solid #6c3fff' : '2px solid transparent', cursor: 'pointer', fontSize: 13, fontWeight: isActive ? 600 : 500, background: isActive ? 'linear-gradient(135deg, rgba(108,63,255,0.18), rgba(108,63,255,0.08))' : 'transparent', color: isActive ? '#a78bfa' : '#52527a', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ opacity: isActive ? 1 : 0.7, display: 'flex', alignItems: 'center', flexShrink: 0 }}>{NavIcons[item.icon]}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.path === '/notifications' && unread > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, background: 'linear-gradient(135deg, #7c4dff, #6c3fff)', color: '#fff', borderRadius: 20, padding: '2px 7px', minWidth: 18, textAlign: 'center', boxShadow: '0 0 8px rgba(108,63,255,0.5)' }}>{unread}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Create New */}
        <div style={{ padding: '14px 12px', flex: 1 }}>
          <div style={{ fontSize: 9, color: '#3a3a58', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 6 }}>Create New</div>
          <button onClick={() => handleCreateDoc('document')} className="cl-create-btn" style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: 'transparent', color: '#7c5cdb', display: 'flex', alignItems: 'center', gap: 9 }}>
            <FileIcon /> Rich Document
          </button>
          <button onClick={() => handleCreateDoc('code')} className="cl-create-btn" style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: 'transparent', color: '#22d3ee', display: 'flex', alignItems: 'center', gap: 9 }}>
            <CodeIcon /> Source Code
          </button>
        </div>

        {/* ── User info + Logout at bottom of sidebar ── */}
        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', marginBottom: 8 }}>
            {/* Avatar */}
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #7c4dff, #6c3fff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {userInitial}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#d4d4e8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userName}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 10, color: '#3a3a58', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userEmail}
              </p>
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="cl-logout-btn"
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: '#52527a', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            <LogoutIcon /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="cl-main" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Top header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 36px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(7,8,15,0.8)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f0f0ff', margin: 0, letterSpacing: '-0.5px', lineHeight: 1 }}>Dashboard</h2>
            <p style={{ color: '#3a3a58', fontSize: 12, fontWeight: 500, margin: '5px 0 0' }}>
              {activeWorkspace
                ? <span>Workspace: <span style={{ color: '#7c5cdb', fontFamily: 'monospace' }}>{activeWorkspace.name}</span></span>
                : "No workspace selected"}
            </p>
          </div>

          {/* Header right — greeting + create buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Greeting */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #7c4dff, #6c3fff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {userInitial}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#d4d4e8', lineHeight: 1 }}>{userName}</p>
                <p style={{ margin: '2px 0 0', fontSize: 10, color: '#3a3a58', lineHeight: 1 }}>{userEmail}</p>
              </div>
            </div>

            {/* Create buttons */}
            <button className="cl-quick-btn" onClick={() => handleCreateDoc('document')} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, border: '1px solid rgba(108,63,255,0.3)', background: 'rgba(108,63,255,0.08)', color: '#a78bfa', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <FileIcon /> Doc
            </button>
            <button className="cl-quick-btn" onClick={() => handleCreateDoc('document')} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #7c4dff, #6c3fff)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 20px rgba(108,63,255,0.35)' }}>
              <PlusIcon /> Quick Doc
            </button>

            {/* Logout */}
            <button onClick={handleLogout} className="cl-logout-btn" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: '#52527a', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <LogoutIcon /> Sign out
            </button>
          </div>
        </header>

        {/* Body */}
        <div style={{ padding: '32px 36px', flex: 1 }}>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', padding: '12px 16px', borderRadius: 10, marginBottom: 24, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {docs.length > 0 && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
              {[
                { label: 'Total Docs',  value: docs.length,                               color: '#a78bfa' },
                { label: 'Code Files', value: docs.filter(d => d.type === 'code').length,  color: '#22d3ee' },
                { label: 'Documents',  value: docs.filter(d => d.type !== 'code').length,  color: '#818cf8' },
              ].map(stat => (
                <div key={stat.label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 20px', flex: '0 0 auto' }}>
                  <div style={{ fontSize: 11, color: '#3a3a58', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{stat.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                </div>
              ))}
            </div>
          )}

          {activeWorkspace && !loading && docs.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#3a3a58', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                All Documents · {docs.length}
              </div>
            </div>
          )}

          {!activeWorkspace && !loading ? (
            <div style={{ border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 20, padding: '60px 40px', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, margin: '0 auto 20px', background: 'rgba(108,63,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6c3fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <p style={{ color: '#52527a', fontSize: 14, fontWeight: 500, margin: '0 0 8px' }}>No workspace selected</p>
              <p style={{ color: '#2e2e48', fontSize: 12, margin: 0 }}>Create or select a workspace from the sidebar to get started.</p>
            </div>

          ) : loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 16, padding: 24, height: 160, animation: 'pulse 1.5s ease-in-out infinite' }}>
                  <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }`}</style>
                </div>
              ))}
            </div>

          ) : docs.length === 0 && activeWorkspace ? (
            <div style={{ border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 20, padding: '60px 40px', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, margin: '0 auto 20px', background: 'rgba(108,63,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6c3fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
              </div>
              <p style={{ color: '#52527a', fontSize: 14, fontWeight: 500, margin: '0 0 8px' }}>No documents yet</p>
              <p style={{ color: '#2e2e48', fontSize: 12, margin: '0 0 20px' }}>Create one from the sidebar or use Quick Doc above.</p>
              <button onClick={() => handleCreateDoc('document')} style={{ padding: '9px 20px', borderRadius: 9, border: '1px solid rgba(108,63,255,0.3)', background: 'rgba(108,63,255,0.08)', color: '#a78bfa', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <PlusIcon /> Create First Document
              </button>
            </div>

          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {docs.map((doc) => (
                <div key={doc.id} className="cl-doc-card" onClick={() => navigate(`/editor/${doc.id}`)} style={{ background: 'linear-gradient(145deg, rgba(11,12,24,0.9), rgba(9,9,18,0.95))', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '22px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: doc.type === 'code' ? 'linear-gradient(90deg, transparent, rgba(34,211,238,0.4), transparent)' : 'linear-gradient(90deg, transparent, rgba(108,63,255,0.4), transparent)' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 7, background: doc.type === 'code' ? 'rgba(34,211,238,0.08)' : 'rgba(108,63,255,0.1)', border: `1px solid ${doc.type === 'code' ? 'rgba(34,211,238,0.15)' : 'rgba(108,63,255,0.15)'}` }}>
                      <span style={{ color: doc.type === 'code' ? '#22d3ee' : '#a78bfa', display: 'flex' }}>{doc.type === 'code' ? <CodeIcon /> : <FileIcon />}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: doc.type === 'code' ? '#22d3ee' : '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{doc.type === 'code' ? 'Code' : 'Doc'}</span>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2e2e48' }}>{doc.language || 'Plain'}</span>
                  </div>

                  <h4 className="card-title" style={{ fontSize: 15, fontWeight: 700, color: '#d4d4e8', margin: '0 0 6px', lineHeight: 1.35, transition: 'color 0.2s' }}>{doc.title}</h4>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, #3a2060, #1a0f3d)', border: '1px solid rgba(108,63,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#a78bfa', flexShrink: 0 }}>
                        {getInitials(doc.createdBy?.name)}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 11, color: '#8888aa', fontWeight: 500, lineHeight: 1 }}>{doc.createdBy?.name || 'Unknown'}</p>
                        <p style={{ margin: '3px 0 0', fontSize: 10, color: '#2e2e48', display: 'flex', alignItems: 'center', gap: 4 }}><ClockIcon /> {formatDate(doc.updatedAt)}</p>
                      </div>
                    </div>
                    <span className="card-arrow" style={{ color: '#a78bfa', opacity: 0, transition: 'all 0.2s', display: 'flex', alignItems: 'center' }}><ArrowIcon /></span>
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