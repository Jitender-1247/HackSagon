import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useEffect } from 'react'

const NAV_ITEMS = [
  { path: '/',              icon: '⬡',  label: 'Dashboard'     },
  { path: '/members',       icon: '◈',  label: 'Members'       },
  { path: '/tasks',         icon: '✦',  label: 'Tasks'         },
  { path: '/notifications', icon: '⊙',  label: 'Notifications' },
]

export default function Sidebar() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { workspaces, activeWorkspace, setActiveWorkspace, loadWorkspaces, notifications } = useStore()

  useEffect(() => {
    loadWorkspaces()
  }, [])

  const unread = notifications.filter(n => !n.isRead).length

  return (
    <aside style={{
      width: 220,
      background: '#0b0c18',
      borderRight: '1px solid #1a1b2e',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      height: '100vh',
    }}>

      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1a1b2e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: '#6c3fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: '#fff', fontWeight: 700,
          }}>
            ✦
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0ff', letterSpacing: '-0.3px' }}>
              CollabLearn
            </div>
            <div style={{ fontSize: 9, color: '#3d3d5c', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Workspace Engine
            </div>
          </div>
        </div>
      </div>

      {/* Workspace switcher */}
      <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid #1a1b2e' }}>
        <div style={{ fontSize: 9, color: '#3d3d5c', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6, paddingLeft: 8 }}>
          Workspace
        </div>
        {workspaces.length === 0 ? (
          <div style={{ fontSize: 12, color: '#3d3d5c', padding: '6px 8px' }}>
            No workspaces yet
          </div>
        ) : (
          workspaces.map(ws => (
            <button
              key={ws.id}
              onClick={() => setActiveWorkspace(ws)}
              style={{
                width: '100%', textAlign: 'left',
                padding: '6px 8px', borderRadius: 7, border: 'none',
                cursor: 'pointer', fontSize: 12, fontWeight: 500,
                transition: 'all 0.15s',
                background: activeWorkspace?.id === ws.id ? '#1a0f3d' : 'transparent',
                color: activeWorkspace?.id === ws.id ? '#a78bfa' : '#6060a0',
                marginBottom: 2,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: activeWorkspace?.id === ws.id ? '#6c3fff' : '#2a2a4a',
                flexShrink: 0,
              }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ws.name}
              </span>
            </button>
          ))
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px' }}>
        <div style={{ fontSize: 9, color: '#3d3d5c', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6, paddingLeft: 8 }}>
          Navigate
        </div>
        {NAV_ITEMS.map(item => {
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                width: '100%', textAlign: 'left',
                padding: '8px 10px', borderRadius: 8, border: 'none',
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
                transition: 'all 0.15s',
                background: isActive ? '#1a0f3d' : 'transparent',
                color: isActive ? '#a78bfa' : '#6060a0',
                marginBottom: 2,
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>

              {/* Unread badge on notifications */}
              {item.path === '/notifications' && unread > 0 && (
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  background: '#6c3fff', color: '#fff',
                  borderRadius: 20, padding: '1px 6px',
                  minWidth: 16, textAlign: 'center',
                }}>
                  {unread}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Create new doc shortcuts */}
      <div style={{ padding: '12px', borderTop: '1px solid #1a1b2e' }}>
        <div style={{ fontSize: 9, color: '#3d3d5c', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6, paddingLeft: 8 }}>
          Create New
        </div>
        <button
          onClick={() => navigate('/')}
          style={{
            width: '100%', textAlign: 'left',
            padding: '7px 10px', borderRadius: 8, border: 'none',
            cursor: 'pointer', fontSize: 12, fontWeight: 500,
            background: 'transparent', color: '#a78bfa',
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#12122a'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span>¶</span> Rich Document
        </button>
        <button
          onClick={() => navigate('/')}
          style={{
            width: '100%', textAlign: 'left',
            padding: '7px 10px', borderRadius: 8, border: 'none',
            cursor: 'pointer', fontSize: 12, fontWeight: 500,
            background: 'transparent', color: '#22d3ee',
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#12122a'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span>{'</>'}</span> Source Code
        </button>
      </div>

    </aside>
  )
}