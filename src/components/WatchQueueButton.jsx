import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useQueue } from '../context/QueueContext'
import { useAnime } from '../context/AnimeContext'
import { findAnimeById } from '../utils/watch'
import { goWatchFromQueue } from '../utils/animeNav'
import { loadSitePrefs } from '../utils/sitePrefs'
import { actionBtnSecondary, ACTION_BTN_H, ACTION_BTN_RADIUS } from '../constants/ui'

const QUEUE_ICON = (
  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
)

export default function WatchQueueButton({
  animeId,
  animeTitle,
  cover,
  episodeId = null,
  episodeTitle = null,
  episodeNumber = null,
  className = '',
  showPlay = false,
  variant = 'default',
}) {
  const { user } = useAuth()
  const { toggleQueue, toggleEpisodeQueue, isInQueue } = useQueue()
  const { animeList } = useAnime()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const inQueue = isInQueue(animeId, episodeId)

  const toggle = async (e) => {
    e?.stopPropagation?.()
    e?.preventDefault?.()
    if (!user || busy) return
    setBusy(true)
    try {
      if (episodeId) {
        toggleEpisodeQueue(animeId, episodeId, {
          animeTitle,
          cover,
          episodeTitle,
          number: episodeNumber,
        })
      } else {
        toggleQueue(animeId, { animeTitle, cover })
      }
    } finally {
      setBusy(false)
    }
  }

  const startWatch = (e) => {
    e?.stopPropagation?.()
    e?.preventDefault?.()
    const anime = findAnimeById(animeList, animeId)
    if (!anime) return
    const prefs = loadSitePrefs()
    goWatchFromQueue(navigate, anime, {
      episodeId: episodeId || undefined,
      requestFullscreen: prefs.autoFullscreen,
    })
  }

  const compactCls = `${actionBtnSecondary} gap-1.5 px-3 text-xs font-semibold ${className}`

  if (!user) {
    if (variant === 'compact') {
      return (
        <Link
          to="/auth"
          onClick={(e) => e.stopPropagation()}
          className={`${compactCls} border-white/15 bg-bg-card/80 text-text-muted hover:border-accent/40`}
        >
          {QUEUE_ICON}
          В очередь
        </Link>
      )
    }
    return (
      <Link
        to="/auth"
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-5 py-3 text-sm font-medium text-white backdrop-blur-sm hover:border-accent/35 ${className}`}
      >
        {QUEUE_ICON}
        В очередь
      </Link>
    )
  }

  if (showPlay && inQueue) {
    return (
      <div className={`flex gap-2 ${className}`} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={startWatch}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg-dark hover:bg-accent-btn"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Смотреть
        </button>
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl border border-accent/45 bg-accent/15 px-4 py-2.5 text-sm font-medium text-accent"
        >
          В очереди
        </button>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          toggle(e)
        }}
        disabled={busy}
        title={inQueue ? 'Убрать из очереди' : 'Добавить в очередь'}
        className={`${compactCls} ${
          inQueue
            ? 'border-accent/35 bg-accent/15 text-white'
            : ''
        }`}
      >
        {inQueue ? (
          <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        ) : (
          QUEUE_ICON
        )}
        {inQueue ? 'В очереди' : 'В очередь'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      title={inQueue ? 'Смотреть с 1 серии' : 'Добавить в очередь просмотра'}
      className={`inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium backdrop-blur-sm transition ${
        inQueue
          ? 'border-accent/45 bg-accent/15 text-accent'
          : 'border-white/25 bg-white/5 text-white hover:border-accent/35 hover:bg-white/10'
      } ${className}`}
    >
      {inQueue ? (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      ) : (
        QUEUE_ICON
      )}
      {inQueue ? (showPlay ? 'Смотреть' : 'В очереди') : 'В очередь'}
    </button>
  )
}
