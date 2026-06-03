import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { mediaUrl } from '../api'
import DropdownPortal from './ui/DropdownPortal'

const ICONS = {
  star: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  list: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10" />
    </svg>
  ),
  settings: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  logout: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
}

const MENU_ITEMS = [
  { to: '/favorites', label: 'Избранное', icon: 'star' },
  { to: '/collection', label: 'Коллекции', icon: 'list' },
  { to: '/profile', label: 'Настройки', icon: 'settings', match: '/profile' },
]

function MenuRow({ icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition ${
        active
          ? 'rounded-xl bg-accent/15 font-medium text-accent'
          : 'text-white/90 hover:bg-white/5'
      }`}
    >
      <span className={active ? 'text-accent' : 'text-text-muted'}>{ICONS[icon]}</span>
      {label}
    </button>
  )
}

export default function UserMenu() {
  const { user, logout, isAuthenticated, loading } = useAuth()
  const [open, setOpen] = useState(false)
  const btnRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!open) return undefined
    const close = (e) => {
      if (btnRef.current?.contains(e.target)) return
      if (e.target.closest('[data-dropdown-menu]')) return
      setOpen(false)
    }
    const timer = window.setTimeout(() => {
      document.addEventListener('mousedown', close)
    }, 0)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('mousedown', close)
    }
  }, [open])

  if (loading) return null

  if (!isAuthenticated) {
    return (
      <button
        type="button"
        onClick={() => navigate('/auth')}
        className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-bg-dark transition hover:bg-accent-btn"
      >
        Войти
      </button>
    )
  }

  const avatar = user.avatar ? mediaUrl(user.avatar) : null
  const displayId = user.displayId ?? '—'

  const go = (path) => {
    setOpen(false)
    navigate(path)
  }

  return (
    <div className="relative z-[200]">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-accent/40 bg-bg-card text-sm font-bold ring-2 ring-transparent transition hover:ring-accent/25"
        aria-expanded={open}
      >
        {avatar ? (
          <img src={avatar} alt="" className="h-full w-full object-cover" />
        ) : (
          user.nickname?.[0]?.toUpperCase() || 'A'
        )}
      </button>

      <DropdownPortal anchorRef={btnRef} open={open} align="right" className="min-w-[15.5rem] overflow-hidden">
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-3 py-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-bg-dark">
            {avatar ? (
              <img src={avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-accent">
                {user.nickname?.[0]?.toUpperCase() || 'A'}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{user.nickname}</p>
            <p className="text-xs text-text-muted">ID: {displayId}</p>
          </div>
        </div>

        <div className="p-1.5">
          {MENU_ITEMS.map((item) => (
            <MenuRow
              key={item.to}
              icon={item.icon}
              label={item.label}
              active={location.pathname.startsWith(item.match || item.to)}
              onClick={(e) => {
                e.stopPropagation()
                go(item.to)
              }}
            />
          ))}
        </div>

        <div className="border-t border-white/[0.06] p-1.5">
          <MenuRow
            icon="logout"
            label="Выход"
            onClick={async (e) => {
              e.stopPropagation()
              setOpen(false)
              await logout()
              navigate('/')
            }}
          />
        </div>
      </DropdownPortal>
    </div>
  )
}
