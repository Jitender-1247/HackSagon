import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useEffect } from 'react'
import Logo from '../assets/inksync_logo.svg'

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
]

const icons = {
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
  doc: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  code: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
    </svg>
  ),
  logout: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
}

export default function Sidebar() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { workspaces, activeWorkspace, setActiveWorkspace, loadWorkspaces, notifications } = useStore()

  useEffect(() => { loadWorkspaces() }, [])

  const unread = (notifications || []).filter(n => !n.isRead).length

  // User info
  const token       = localStorage.getItem('token')
  const me          = decodeJwt(token)
  const userName    = localStorage.getItem('name') || me?.email || 'User'
  const userEmail   = me?.email || ''
  const userInitial = userName.charAt(0).toUpperCase()

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: localStorage.getItem('uid') }),
      })
    } catch {}
    localStorage.clear()
    navigate('/login')
  }

  return (
    <>
      <style>{`
        .cl-sidebar { font-family: 'Inter', -apple-system, sans-serif; }
        .cl-nav-btn { transition: all 0.18s cubic-bezier(0.4,0,0.2,1); }
        .cl-nav-btn:hover { background: rgba(108,63,255,0.08) !important; color: #c4b5fd !important; }
        .cl-nav-btn.active { background: linear-gradient(135deg, rgba(108,63,255,0.18), rgba(108,63,255,0.08)) !important; color: #a78bfa !important; border-right: 2px solid #6c3fff; }
        .cl-ws-btn { transition: all 0.15s; }
        .cl-ws-btn:hover { background: rgba(108,63,255,0.07) !important; color: #c4b5fd !important; }
        .cl-ws-btn.active { background: rgba(108,63,255,0.14) !important; color: #a78bfa !important; }
        .cl-create-btn { transition: all 0.18s; }
        .cl-create-btn:hover { background: rgba(255,255,255,0.04) !important; transform: translateX(2px); }
        .cl-logout-btn { transition: all 0.18s; }
        .cl-logout-btn:hover { background: rgba(239,68,68,0.1) !important; border-color: rgba(239,68,68,0.35) !important; color: #ef4444 !important; }
      `}</style>

      <aside className="cl-sidebar" style={{
        width: 232,
        background: 'linear-gradient(180deg, #09090f 0%, #0b0c1a 100%)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', flexDirection: 'column',
        flexShrink: 0, height: '100vh',
        position: 'relative', overflow: 'hidden',
      }}>

        {/* Ambient glow */}
        <div style={{ position: 'absolute', top: -60, left: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(108,63,255,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div>
          <img src={Logo} alt="Logo" onClick={() => navigate('/dashboard')} style={{ width: 200, margin: 8, cursor: 'pointer' }} />
        </div>

        {/* Workspace switcher */}
        <div style={{ padding: '14px 12px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontSize: 9, color: '#3a3a58', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', paddingLeft: 6, display: 'block', marginBottom: 8 }}>
            Workspace
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {workspaces.length === 0 ? (
              <div style={{ fontSize: 12, color: '#3d3d5c', padding: '8px 6px', fontStyle: 'italic' }}>No workspaces yet</div>
            ) : (
              workspaces.map(ws => (
                <button key={ws.id} onClick={() => setActiveWorkspace(ws)}
                  className={`cl-ws-btn ${activeWorkspace?.id === ws.id ? 'active' : ''}`}
                  style={{ width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: 'transparent', color: activeWorkspace?.id === ws.id ? '#a78bfa' : '#52527a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: activeWorkspace?.id === ws.id ? 'linear-gradient(135deg, #7c4dff, #a78bfa)' : '#252540', boxShadow: activeWorkspace?.id === ws.id ? '0 0 6px rgba(108,63,255,0.6)' : 'none', transition: 'all 0.2s' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{ws.name}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '14px 10px', overflowY: 'auto' }}>
          <div style={{ fontSize: 9, color: '#3a3a58', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 8 }}>Navigate</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV_ITEMS.map(item => {
              const isActive = location.pathname === item.path
              return (
                <button key={item.path} onClick={() => navigate(item.path)}
                  className={`cl-nav-btn ${isActive ? 'active' : ''}`}
                  style={{ width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 9, border: 'none', borderRight: isActive ? '2px solid #6c3fff' : '2px solid transparent', cursor: 'pointer', fontSize: 13, fontWeight: isActive ? 600 : 500, background: isActive ? 'linear-gradient(135deg, rgba(108,63,255,0.18), rgba(108,63,255,0.08))' : 'transparent', color: isActive ? '#a78bfa' : '#52527a', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ opacity: isActive ? 1 : 0.7, display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icons[item.icon]}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.path === '/notifications' && unread > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, background: 'linear-gradient(135deg, #7c4dff, #6c3fff)', color: '#fff', borderRadius: 20, padding: '2px 7px', minWidth: 18, textAlign: 'center', boxShadow: '0 0 8px rgba(108,63,255,0.5)' }}>{unread}</span>
                  )}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Create new */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: 9, color: '#3a3a58', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 8 }}>Create New</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <button onClick={() => navigate('/')} className="cl-create-btn" style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: 'transparent', color: '#7c5cdb', display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ display: 'flex', alignItems: 'center', opacity: 0.9 }}>{icons.doc}</span>
              <span>Rich Document</span>
            </button>
            <button onClick={() => navigate('/')} className="cl-create-btn" style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: 'transparent', color: '#22d3ee', display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ display: 'flex', alignItems: 'center', opacity: 0.9 }}>{icons.code}</span>
              <span>Source Code</span>
            </button>
          </div>
        </div>

        {/* ── User info + Logout ────────────────────────────────────────── */}
        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>

          {/* User card */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', marginBottom: 8 }}>
            {/* Avatar */}
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #7c4dff, #6c3fff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0, boxShadow: '0 0 10px rgba(108,63,255,0.4)' }}>
              {userInitial}
            </div>
            {/* Name + email */}
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
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: '#52527a', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            {icons.logout}
            Sign Out
          </button>
        </div>

      </aside>
    </>
  )
}