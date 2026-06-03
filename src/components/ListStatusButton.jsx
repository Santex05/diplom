import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  setCollectionStatusApi,
  removeFromCollectionApi,
} from '../api/userApi'
import { removeAnimeFromLocalHistory } from '../utils/playerStorage'
import { COLLECTION_TABS } from '../constants/collection'
import { statusActiveStyle, ACTION_BTN_H, ACTION_BTN_RADIUS } from '../constants/ui'
import DropdownPortal from './ui/DropdownPortal'

const STATUS_ICONS = {
  planned: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  watching: (
    <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  watched: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  on_hold: (
    <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
    </svg>
  ),
  dropped: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
}

function ChevronDown({ className = '' }) {
  return (
    <svg className={`h-3.5 w-3.5 shrink-0 opacity-80 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

export default function ListStatusButton({
  animeId,
  animeTitle,
  cover,
  variant = 'pill',
  className = '',
}) {
  const { user, refreshCollection, getCollectionEntry } = useAuth()
  const [open, setOpen] = useState(false)
  const btnRef = useRef(null)

  const entry = user ? getCollectionEntry(animeId) : null
  const status = entry?.status || null
  const statusLabel = COLLECTION_TABS.find((t) => t.id === status)?.label

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

  const notify = async () => {
    await refreshCollection()
    window.dispatchEvent(new Event('anicatalog-collection'))
  }

  const applyStatus = async (nextStatus) => {
    if (status === nextStatus) {
      await removeFromList()
      return
    }
    try {
      await setCollectionStatusApi(animeId, nextStatus, { animeTitle, cover })
      setOpen(false)
      await notify()
    } catch (err) {
      console.error(err)
      alert(err.message || 'Не удалось обновить статус')
    }
  }

  const removeFromList = async () => {
    await removeFromCollectionApi(animeId)
    removeAnimeFromLocalHistory(animeId)
    setOpen(false)
    await notify()
  }

  if (!user) {
    if (variant === 'icon' || variant === 'compact') {
      return (
        <Link
          to="/auth"
          onClick={(e) => e.stopPropagation()}
          className={`inline-flex ${ACTION_BTN_H} items-center gap-1.5 ${ACTION_BTN_RADIUS} border border-white/15 bg-black/50 px-3 text-xs font-semibold text-text-muted hover:border-accent/40 ${className}`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10" />
          </svg>
          В списки
        </Link>
      )
    }
    return (
      <Link
        to="/auth"
        onClick={(e) => e.stopPropagation()}
        className={`rounded-lg border border-white/20 bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-md ${className}`}
      >
        Войти
      </Link>
    )
  }

  const pillLabel = statusLabel || 'В списки'
  const pillActive = Boolean(status)
  const activeBtnClass = `inline-flex ${ACTION_BTN_H} items-center gap-1.5 ${ACTION_BTN_RADIUS} border px-3 text-xs font-semibold transition sm:text-sm ${statusActiveStyle}`

  if (variant === 'icon' || variant === 'compact') {
    return (
      <div ref={btnRef} className={className} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={
            pillActive
              ? activeBtnClass
              : `inline-flex ${ACTION_BTN_H} w-10 items-center justify-center ${ACTION_BTN_RADIUS} border border-white/15 bg-black/50 text-white/80 transition hover:border-accent/35`
          }
          title={pillLabel}
        >
          {pillActive ? (
            <>
              {STATUS_ICONS[status]}
              <span className="max-w-[7rem] truncate">{pillLabel}</span>
              <ChevronDown />
            </>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10" />
            </svg>
          )}
        </button>
        <Menu open={open} status={status} onPick={applyStatus} anchorRef={btnRef} />
      </div>
    )
  }

  if (variant === 'detail') {
    return (
      <div ref={btnRef} className={className} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={
            pillActive
              ? `${activeBtnClass} px-4`
              : `inline-flex ${ACTION_BTN_H} items-center gap-2 ${ACTION_BTN_RADIUS} border border-white/20 bg-black/50 px-4 text-sm font-semibold text-white hover:border-accent/35`
          }
        >
          {STATUS_ICONS[status] || STATUS_ICONS.planned}
          {pillLabel}
          <ChevronDown />
        </button>
        <Menu open={open} status={status} onPick={applyStatus} anchorRef={btnRef} align="left" />
      </div>
    )
  }

  return (
    <div ref={btnRef} className={className} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          pillActive
            ? `${activeBtnClass} px-2.5 py-1 text-[10px] uppercase tracking-wide backdrop-blur-md sm:px-3 sm:py-1.5 sm:text-xs sm:normal-case sm:tracking-normal`
            : `${ACTION_BTN_RADIUS} border border-white/20 bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-md transition hover:border-accent/40`
        }
      >
        {pillActive ? (
          <>
            {STATUS_ICONS[status]}
            <span>{pillLabel}</span>
            <ChevronDown />
          </>
        ) : (
          pillLabel
        )}
      </button>
      <Menu open={open} status={status} onPick={applyStatus} anchorRef={btnRef} />
    </div>
  )
}

function Menu({ open, status, onPick, anchorRef, align = 'left' }) {
  return (
    <DropdownPortal anchorRef={anchorRef} open={open} align={align}>
      {COLLECTION_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation()
            onPick(tab.id)
          }}
          className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition hover:bg-white/5 ${
            status === tab.id ? 'bg-accent/15 font-semibold text-accent' : 'text-white/90'
          }`}
        >
          <span className={status === tab.id ? 'text-accent' : 'text-text-muted'}>
            {STATUS_ICONS[tab.id]}
          </span>
          {tab.label}
        </button>
      ))}
    </DropdownPortal>
  )
}
