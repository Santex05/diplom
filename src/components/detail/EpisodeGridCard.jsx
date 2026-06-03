import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useQueue } from '../../context/QueueContext'
import { watchPath } from '../../utils/watch'
import EpisodeFrameThumbnail from '../EpisodeFrameThumbnail'
import { formatTime, loadProgress, progressPercent } from '../../utils/playerStorage'
import { randomSeekForEpisode } from '../../utils/episodeThumbnail'
import DropdownPortal from '../ui/DropdownPortal'

function seekForThumbnail(episode, progress) {
  const dur = progress?.duration ?? episode.durationSeconds ?? 0
  if (progress?.completed && dur > 0) return dur * 0.92
  if ((progress?.currentTime ?? 0) > 0) return progress.currentTime
  return randomSeekForEpisode(episode.id, dur)
}

function EpisodeMenuItems({
  onMarkWatched,
  onMarkUnwatched,
  onClose,
  anime,
  episode,
  user,
  inQueue,
  onToggleQueue,
}) {
  return (
    <>
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onMarkWatched?.(); onClose() }} className="block w-full px-3 py-2 text-left text-sm hover:bg-white/5">
        Отметить как просмотренный
      </button>
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onMarkUnwatched?.(); onClose() }} className="block w-full px-3 py-2 text-left text-sm hover:bg-white/5">
        Снять отметку о просмотре
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          window.open(watchPath(anime.id, episode.id), '_blank', 'noopener,noreferrer')
          onClose()
        }}
        className="block w-full px-3 py-2 text-left text-sm hover:bg-white/5"
      >
        Открыть в новой вкладке
      </button>
      {user && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onToggleQueue()
            onClose()
          }}
          className="block w-full px-3 py-2 text-left text-sm hover:bg-white/5"
        >
          {inQueue ? 'Убрать из очереди' : 'Добавить в очередь просмотра'}
        </button>
      )}
    </>
  )
}

export default function EpisodeGridCard({
  anime,
  episode,
  onClick,
  onMarkWatched,
  onMarkUnwatched,
  layout = 'grid',
}) {
  const progress = loadProgress(anime.id, episode.id)
  const pct = progress?.completed
    ? 100
    : progressPercent(progress?.currentTime ?? 0, progress?.duration ?? 0)
  const dur = episode.durationSeconds > 0 ? formatTime(episode.durationSeconds) : null
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const { user } = useAuth()
  const { toggleEpisodeQueue, isEpisodeInQueue } = useQueue()
  const inQueue = isEpisodeInQueue(anime.id, episode.id)

  const closeMenu = () => setMenuOpen(false)
  const toggleQueue = () =>
    toggleEpisodeQueue(anime.id, episode.id, {
      animeTitle: anime.title,
      cover: anime.cover,
      episodeTitle: episode.title,
      number: episode.number,
    })

  useEffect(() => {
    if (!menuOpen) return undefined
    const close = (e) => {
      if (menuRef.current?.contains(e.target)) return
      if (e.target.closest('[data-dropdown-menu]')) return
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  if (layout === 'list') {
    return (
      <article className="group relative flex items-stretch gap-3 overflow-hidden rounded-xl border border-white/[0.08] bg-bg-card/80 p-2 transition hover:border-accent/35">
        <button type="button" onClick={onClick} className="relative w-36 shrink-0 overflow-hidden rounded-lg">
          <EpisodeFrameThumbnail
            animeId={anime.id}
            episodeMeta={episode}
            seekSeconds={seekForThumbnail(episode, progress)}
            cover={anime.cover}
            episodeNumber={episode.number}
            progressPct={pct}
            className="aspect-video w-full rounded-none border-0"
          />
          {dur && (
            <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 text-[10px] text-white">{dur}</span>
          )}
        </button>
        <button type="button" onClick={onClick} className="min-w-0 flex-1 py-1 text-left">
          <p className="text-sm font-bold text-white">{episode.number} эпизод</p>
          <p className="line-clamp-2 text-xs text-text-muted">{episode.title}</p>
        </button>
        <div ref={menuRef} className="relative shrink-0 self-center">
          <button type="button" onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }} className="rounded-lg p-2 text-white/80 hover:bg-white/5" aria-label="Меню">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
          </button>
          <DropdownPortal anchorRef={menuRef} open={menuOpen} align="right" className="min-w-[12rem]">
            <EpisodeMenuItems
              onMarkWatched={onMarkWatched}
              onMarkUnwatched={onMarkUnwatched}
              onClose={closeMenu}
              anime={anime}
              episode={episode}
              user={user}
              inQueue={inQueue}
              onToggleQueue={toggleQueue}
            />
          </DropdownPortal>
        </div>
      </article>
    )
  }

  return (
    <article className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-bg-card/80 transition hover:border-accent/35">
      <button type="button" onClick={onClick} className="relative block w-full text-left">
        <EpisodeFrameThumbnail
          animeId={anime.id}
          episodeMeta={episode}
          seekSeconds={seekForThumbnail(episode, progress)}
          cover={anime.cover}
          episodeNumber={episode.number}
          progressPct={0}
          className="aspect-video w-full rounded-none border-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="line-clamp-2 text-xs text-white/90">{episode.title}</p>
          <p className="mt-1 text-lg font-bold text-white">{episode.number} эпизод</p>
        </div>
        {dur && (
          <span className="absolute bottom-3 right-3 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] text-white">
            {dur}
          </span>
        )}
        {pct > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/60">
            <div
              className={`h-full ${pct >= 100 ? 'bg-emerald-400' : 'bg-accent'}`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        )}
      </button>
      <div ref={menuRef} className="absolute right-2 top-2 z-10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpen((v) => !v)
          }}
          className="rounded-lg bg-black/50 p-1.5 text-white/90 backdrop-blur-sm hover:bg-black/70"
          aria-label="Меню"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        </button>
        <DropdownPortal anchorRef={menuRef} open={menuOpen} align="right" className="min-w-[12rem]">
          <EpisodeMenuItems
            onMarkWatched={onMarkWatched}
            onMarkUnwatched={onMarkUnwatched}
            onClose={closeMenu}
            anime={anime}
            episode={episode}
            user={user}
            inQueue={inQueue}
            onToggleQueue={toggleQueue}
          />
        </DropdownPortal>
      </div>
    </article>
  )
}
