import { Link } from 'react-router-dom'
import { STICKY_BELOW_NAV } from '../constants/layout'
import EpisodeFrameThumbnail from './EpisodeFrameThumbnail'
import { loadProgress, formatTime, progressPercent } from '../utils/playerStorage'
import { randomSeekForEpisode } from '../utils/episodeThumbnail'
import { watchPath } from '../utils/watch'
function episodeDurationLabel(ep) {
  if (ep.durationSeconds > 0) return formatTime(ep.durationSeconds)
  return '—'
}

function seekForThumbnail(episode, progress) {
  const dur = progress?.duration ?? episode.durationSeconds ?? 0
  if (progress?.completed && dur > 0) return dur * 0.92
  if ((progress?.currentTime ?? 0) > 0) return progress.currentTime
  return randomSeekForEpisode(episode.id, dur)
}

export default function EpisodeListPanel({ anime, currentEpisodeId }) {
  const episodes = Array.isArray(anime.episodes)
    ? [...anime.episodes].sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
    : []

  return (
    <aside className={`w-full shrink-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-bg-card/80 backdrop-blur-sm xl:sticky xl:w-[340px] ${STICKY_BELOW_NAV}`}>
      <div className="border-b border-white/[0.06] px-5 py-4">
        <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-white">
          Список серий
        </h2>
        <p className="mt-1 text-xs text-text-muted">{episodes.length} серий</p>
      </div>

      <ul className="max-h-[min(640px,70vh)] space-y-2 overflow-y-auto p-3">
        {episodes.length === 0 && (
          <li className="px-3 py-8 text-center text-sm text-text-muted">Нет серий</li>
        )}

        {episodes.map((ep) => {
          const isActive = String(ep.id) === String(currentEpisodeId)
          const progress = loadProgress(anime.id, ep.id)
          const pct = progress?.completed
            ? 100
            : progressPercent(progress?.currentTime ?? 0, progress?.duration ?? 0)
          const watched = progress?.completed
          const inProgress = progress && !watched && (progress.currentTime ?? 0) > 0

          return (
            <li key={ep.id}>
              <Link
                to={watchPath(anime.id, ep.id)}
                state={{ anime }}
                className={`block overflow-hidden rounded-xl border p-2 transition duration-200 ${
                  isActive
                    ? 'border-accent/50 bg-accent/10 shadow-md shadow-accent/10'
                    : 'border-transparent bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex gap-2.5">
                  <EpisodeFrameThumbnail
                    animeId={anime.id}
                    episodeMeta={ep}
                    seekSeconds={seekForThumbnail(ep, progress)}
                    cover={anime.cover}
                    episodeNumber={ep.number}
                    progressPct={pct}
                    highlight={isActive}
                    className="w-24 shrink-0"
                  />
                  <div className="min-w-0 flex-1 py-0.5">
                    <p
                      className={`line-clamp-2 text-sm leading-snug ${
                        isActive ? 'font-semibold text-white' : 'text-white/90'
                      }`}
                    >
                      {ep.title}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {inProgress
                        ? `Продолжить · ${pct}%`
                        : watched
                          ? 'Просмотрено'
                          : episodeDurationLabel(ep)}
                    </p>
                    {isActive && (
                      <span className="mt-1 inline-block text-[10px] font-bold uppercase text-accent">
                        Текущая
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
