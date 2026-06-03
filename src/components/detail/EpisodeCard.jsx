import EpisodeFrameThumbnail from '../EpisodeFrameThumbnail'
import { formatTime, loadProgress, progressPercent } from '../../utils/playerStorage'
import { randomSeekForEpisode } from '../../utils/episodeThumbnail'

function episodeDuration(ep) {
  if (ep.durationSeconds > 0) return formatTime(ep.durationSeconds)
  return null
}

function seekForThumbnail(episode, progress) {
  const dur = progress?.duration ?? episode.durationSeconds ?? 0
  if (progress?.completed && dur > 0) return dur * 0.92
  if ((progress?.currentTime ?? 0) > 0) return progress.currentTime
  return randomSeekForEpisode(episode.id, dur)
}

export default function EpisodeCard({ anime, episode, onClick, index = 0 }) {
  const progress = loadProgress(anime.id, episode.id)
  const pct = progress?.completed
    ? 100
    : progressPercent(progress?.currentTime ?? 0, progress?.duration ?? 0)
  const watched = progress?.completed
  const inProgress = progress && !watched && (progress.currentTime ?? 0) > 0
  const dur = episodeDuration(episode)

  return (
    <button
      type="button"
      onClick={onClick}
      className="home-fade-up group flex w-full gap-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-bg-card/60 p-3 text-left transition duration-300 hover:border-accent/35 hover:bg-bg-card hover:shadow-lg hover:shadow-accent/5 sm:p-4"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <EpisodeFrameThumbnail
        animeId={anime.id}
        episodeMeta={episode}
        seekSeconds={seekForThumbnail(episode, progress)}
        cover={anime.cover}
        episodeNumber={episode.number}
        progressPct={pct}
        className="w-36 sm:w-44"
      />
      <div className="flex min-w-0 flex-1 flex-col justify-center py-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
          Серия {episode.number}
        </p>
        <h3 className="mt-0.5 line-clamp-2 font-semibold text-white transition group-hover:text-accent">
          {episode.title}
        </h3>
        {episode.description && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-text-muted">
            {episode.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-muted">
          {dur && <span>{dur}</span>}
          {watched && <span className="text-emerald-400/90">Просмотрено</span>}
          {inProgress && !watched && (
            <span className="text-accent">Продолжить · {pct}%</span>
          )}
        </div>
      </div>
      <span className="hidden shrink-0 self-center rounded-full border border-white/10 p-2.5 text-accent transition group-hover:border-accent/40 group-hover:bg-accent/10 sm:flex">
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
    </button>
  )
}
