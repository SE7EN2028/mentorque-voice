import { useCallback, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useDismissOnEscapeOrOutside } from '../../hooks/useDismissOnEscapeOrOutside'

type NavKey = 'dashboard' | 'new-interview' | 'history' | 'profile'

const NAV_ITEMS: { key: NavKey; to: string; label: string; icon: React.ReactNode }[] = [
  {
    key: 'dashboard',
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    key: 'new-interview',
    to: '/interview/new',
    label: 'New Interview',
    icon: (
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="9" y="2" width="6" height="11" rx="3" />
        <path d="M5 10a7 7 0 0 0 14 0" />
        <line x1="12" y1="17" x2="12" y2="21" />
        <line x1="8" y1="21" x2="16" y2="21" />
      </svg>
    ),
  },
  {
    key: 'history',
    to: '/sessions',
    label: 'Session History',
    icon: (
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15.5 14" />
      </svg>
    ),
  },
  {
    key: 'profile',
    to: '/profile',
    label: 'Profile',
    icon: (
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
      </svg>
    ),
  },
]

function activeKeyForPath(pathname: string): NavKey | null {
  if (pathname.startsWith('/dashboard')) return 'dashboard'
  if (pathname.startsWith('/interview/new')) return 'new-interview'
  if (pathname.startsWith('/sessions')) return 'history'
  if (pathname.startsWith('/profile')) return 'profile'
  return null
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

export function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const activeKey = activeKeyForPath(location.pathname)

  useDismissOnEscapeOrOutside(menuOpen, userMenuRef, () => setMenuOpen(false))

  const handleLogout = useCallback(async () => {
    await logout()
    navigate('/login', { replace: true })
  }, [logout, navigate])

  return (
    // Collapses to an icon-only rail below `md` — the approved 264px design
    // only fits alongside real content from `md` up, so narrower viewports
    // get a narrower rail (labels hidden) rather than the sidebar and page
    // content overlapping/overflowing illegibly.
    <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col overflow-y-auto border-r border-hairline bg-sidebar px-2 pt-5.5 pb-4 md:w-[264px] md:px-3.5">
      <Link
        to="/dashboard"
        className="mb-3.5 flex items-center gap-2.5 border-b border-hairline px-2.5 pt-0.5 pb-5 no-underline"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center gap-[2.5px] rounded-[9px] bg-gradient-to-br from-violet-500 to-purple-500 shadow-[0_4px_14px_-2px_rgba(110,86,248,0.55)]">
          <span className="h-[9px] w-[3px] rounded-sm bg-white/85" />
          <span className="h-4 w-[3px] rounded-sm bg-white" />
          <span className="h-1.5 w-[3px] rounded-sm bg-white/85" />
        </span>
        <span className="hidden font-display text-[17px] font-bold tracking-tight text-ink md:inline">
          MentorQ
        </span>
      </Link>

      <div className="mb-2 hidden px-2.5 text-[11px] font-bold tracking-[0.08em] text-[#565a6b] uppercase md:block">
        Menu
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === activeKey
          return (
            <Link
              key={item.key}
              to={item.to}
              title={item.label}
              className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14.5px] no-underline transition-colors ${
                isActive
                  ? 'bg-violet-500/16 font-semibold text-[#ede9fe] shadow-[inset_0_0_0_1px_rgba(110,86,248,0.28)]'
                  : 'font-medium text-[#9c9fb0] hover:bg-white/5 hover:text-ink'
              }`}
            >
              <span className={isActive ? 'text-[#b9a6ff]' : ''}>{item.icon}</span>
              <span className="hidden md:inline">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="flex-1" />

      <div className="relative border-t border-hairline pt-3" ref={userMenuRef}>
        {menuOpen && (
          <div className="absolute bottom-[60px] left-0 z-50 w-48 rounded-xl border border-white/10 bg-surface-2 p-1.5 shadow-[0_24px_55px_-12px_rgba(0,0,0,0.65)] md:right-0 md:w-auto">
            <Link
              to="/profile"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[13.5px] text-[#d5d7e0] no-underline hover:bg-white/6"
            >
              Profile &amp; Settings
            </Link>
            <div className="mx-1 my-1 h-px bg-hairline" />
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-[13.5px] text-[#fb7185] hover:bg-red-400/10"
            >
              Log out
            </button>
          </div>
        )}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          title={user ? `${user.name} — account menu` : 'Account menu'}
          className="flex w-full items-center gap-2.5 rounded-[10px] p-1.5 text-left hover:bg-white/5"
        >
          <span className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-violet-500 to-cyan-400 font-display text-[12.5px] font-bold text-white">
            {user ? initialsFor(user.name) : '—'}
          </span>
          <span className="hidden min-w-0 flex-1 text-left md:block">
            <div className="truncate text-[13.5px] font-semibold text-ink">{user?.name}</div>
            <div className="truncate text-xs text-[#6a6d7c]">{user?.email}</div>
          </span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6a6d7c"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="hidden shrink-0 md:block"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
    </aside>
  )
}
