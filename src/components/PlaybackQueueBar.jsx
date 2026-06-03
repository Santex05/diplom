import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useQueue } from '../context/QueueContext'
import { useAnime } from '../context/AnimeContext'
import { findAnimeById } from '../utils/watch'
import { goWatchFromQueue } from '../utils/animeNav'
import { loadSitePrefs } from '../utils/sitePrefs'
import AnimePoster from './AnimePoster'
import { formatTime } from '../utils/playerStorage'

export default function PlaybackQueueBar() {
  const { items, removeQueueItem } = useQueue()
  const { animeList } = useAnime()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)

  if (!items.length) return null

  const current = items[0]
  const dur = current.durationSeconds > 0 ? formatTime(current.durationSeconds) : null

  const playItem = (item) => {
    const anime = findAnimeById(animeList, item.animeId)
    if (!anime) return
    const prefs = loadSitePrefs()
    goWatchFromQueue(navigate, anime, {
      episodeId: item.episodeId,
      requestFullscreen: prefs.autoFullscreen,
    })
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9000] w-[min(100%,24rem)] overflow-hidden rounded-2xl border border-white/10 bg-bg-card shadow-2xl">
      <div className="flex gap-3 p-3">
        <button type="button" onClick={() => playItem(current)} className="relative shrink-0 overflow-hidden rounded-lg">
          <AnimePoster cover={current.cover} alt="" className="h-16 w-24" imgClassName="h-full w-full object-cover" />
          {dur && <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[10px] text-white">{dur}</span>}
        </button>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => playItem(current)} className="line-clamp-2 text-left text-sm font-semibold text-white hover:text-accent">{current.animeTitle}</button>
          <p className="mt-0.5 text-xs text-text-muted">Эпизод {current.episodeNumber}</p>
          <p className="line-clamp-1 text-[11px] text-text-muted/80">{current.episodeTitle}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button type="button" onClick={() => playItem(current)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-bg-dark hover:bg-accent-btn" title="Смотреть">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </button>
          <button type="button" onClick={() => removeQueueItem(current.id)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 text-text-muted hover:text-white" title="Убрать">×</button>
        </div>
      </div>
      <button type="button" onClick={() => setExpanded((v) => !v)} className="flex w-full items-center justify-between border-t border-white/[0.06] px-3 py-2 text-xs text-text-muted hover:bg-white/[0.03]">
        <span>Очередь · {items.length}</span>
        <span className="text-white/60">{expanded ? '▴' : '▾'}</span>
      </button>
      {expanded && items.length > 1 && (
        <ul className="max-h-56 overflow-y-auto border-t border-white/[0.06] catalog-scroll">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 border-b border-white/[0.04] px-3 py-2 last:border-0">
              <AnimePoster cover={item.cover} alt="" className="h-10 w-14 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white">{item.animeTitle}</p>
                <p className="text-[10px] text-text-muted">Эпизод {item.episodeNumber}</p>
              </div>
              <button type="button" onClick={() => playItem(item)} className="rounded-lg p-1.5 text-accent hover:bg-accent/10" title="Смотреть">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </button>
              <button type="button" onClick={() => removeQueueItem(item.id)} className="rounded-lg p-1.5 text-text-muted hover:text-white" title="Убрать">×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
