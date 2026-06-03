import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { toggleFavoriteApi } from '../api/userApi'
import { ACTION_BTN_H, ACTION_BTN_RADIUS } from '../constants/ui'

export default function FavoriteStarButton({ animeId, className = '', size = 'md' }) {
  const { user, favorites, refreshFavorites } = useAuth()
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)

  const active = favorites.includes(String(animeId))

  const toggle = async (e) => {
    e?.stopPropagation?.()
    if (!user || busy) return
    setBusy(true)
    try {
      await toggleFavoriteApi(animeId)
      await refreshFavorites()
      window.dispatchEvent(new Event('anicatalog-favorites'))
    } finally {
      setBusy(false)
    }
  }

  const dim = `${ACTION_BTN_H} w-10`
  const icon = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'

  if (!user) {
    return (
      <Link
        to="/auth"
        onClick={(e) => e.stopPropagation()}
        className={`flex ${dim} items-center justify-center ${ACTION_BTN_RADIUS} border border-white/15 bg-black/50 text-text-muted hover:border-accent/40 ${className}`}
        title="Войти, чтобы добавить в избранное"
      >
        <svg className={icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      </Link>
    )
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={toggle}
      disabled={busy}
      title={active ? 'Убрать из избранного' : 'В избранное'}
      className={`flex ${dim} items-center justify-center ${ACTION_BTN_RADIUS} border transition ${
        active
          ? 'border-accent/55 bg-accent/20 text-accent'
          : 'border-white/15 bg-black/50 text-white/80 hover:border-accent/40 hover:text-accent'
      } ${className}`}
    >
      <svg
        className={icon}
        fill={active ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    </button>
  )
}
