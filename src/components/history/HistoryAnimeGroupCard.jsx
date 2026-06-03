import { Link, useNavigate } from 'react-router-dom'
import AnimePoster from '../AnimePoster'
import EpisodeFrameThumbnail from '../EpisodeFrameThumbnail'
import { removeCollectionEpisodeApi } from '../../api/userApi'
import {
  formatTime,
  formatHistoryTime,
  progressPercent,
  removeHistoryEpisode,
} from '../../utils/playerStorage'
import { watchPath } from '../../utils/watch'
import { animeDetailPath } from '../../utils/animeNav'
import { randomSeekForEpisode } from '../../utils/episodeThumbnail'

function pickContinueEpisode(episodes) {
  const sorted = [...episodes].sort(
    (a, b) => new Date(b.lastWatchedAt || 0) - new Date(a.lastWatchedAt || 0),
  )
  const inProgress = sorted.find(
    (ep) =>
      !ep.completed &&
      ((ep.lastPositionSeconds ?? 0) > 0 || (ep.progress ?? 0) > 0),
  )
  return inProgress ?? sorted[0]
}

function episodeStatus(ep) {
  const pct = ep.completed
    ? 100
    : progressPercent(ep.lastPositionSeconds ?? 0, ep.durationSeconds ?? 0)

  if (ep.completed) return { label: 'Просмотрено', pct, tone: 'done' }
  if (pct > 0) {
    const at = formatTime(ep.lastPositionSeconds ?? 0)
    return { label: `Остановились на ${at}`, pct, tone: 'progress' }
  }
  return { label: 'Начали смотреть', pct: 0, tone: 'start' }
}

function seekForThumbnail(ep) {
  const dur = ep.durationSeconds ?? 0
  if (ep.completed && dur > 0) return dur * 0.92
  if ((ep.lastPositionSeconds ?? 0) > 0) return ep.lastPositionSeconds
  return randomSeekForEpisode(ep.episodeId || ep.id, dur)
}

export default function HistoryAnimeGroupCard({ group, onRemoveEpisode }) {
  const navigate = useNavigate()
  const continueEp = pickContinueEpisode(group.episodes)
  const sortedEps = [...group.episodes].sort(
    (a, b) => (a.number ?? 0) - (b.number ?? 0),
  )

  const goContinue = () => {
    if (continueEp) navigate(watchPath(group.animeId, continueEp.episodeId))
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-white/[0.08] bg-bg-card/80 transition duration-300 hover:border-accent/25 hover:shadow-lg hover:shadow-accent/5">
      <div className="flex gap-4 border-b border-white/[0.06] p-4 sm:p-5">
        <Link
          to={animeDetailPath(group.animeId)}
          className="shrink-0 overflow-hidden rounded-xl border border-white/10"
        >
          <AnimePoster
            cover={group.cover}
            alt={group.animeTitle}
            className="h-28 w-20 sm:h-32 sm:w-24"
            imgClassName="h-full w-full object-cover object-center"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <Link
            to={animeDetailPath(group.animeId)}
            className="font-display line-clamp-2 text-lg font-bold text-white transition hover:text-accent sm:text-xl"
          >
            {group.animeTitle}
          </Link>
          <p className="mt-1 text-xs text-text-muted">
            {group.episodes.length}{' '}
            {group.episodes.length === 1 ? 'серия в коллекции' : 'серий в коллекции'}
            {group.lastWatchedAt && (
              <span> · {formatHistoryTime(group.lastWatchedAt)}</span>
            )}
          </p>

          {continueEp && (
            <button
              type="button"
              onClick={goContinue}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-bg-dark shadow-md shadow-accent/20 transition hover:bg-accent-btn"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              {continueEp.completed ? 'Смотреть снова' : 'Продолжить'}
              {continueEp.number != null && (
                <span className="opacity-80">· серия {continueEp.number}</span>
              )}
            </button>
          )}
        </div>
      </div>

      <ul className="divide-y divide-white/[0.06]">
        {sortedEps.map((ep) => {
          const status = episodeStatus(ep)
          const isContinueTarget =
            continueEp && String(ep.episodeId) === String(continueEp.episodeId)

          return (
            <li key={ep.episodeId}>
              <div
                className={`flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5 ${
                  isContinueTarget ? 'bg-accent/[0.06]' : ''
                }`}
              >
                <Link
                  to={watchPath(group.animeId, ep.episodeId)}
                  className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4"
                >
                  <EpisodeFrameThumbnail
                    animeId={group.animeId}
                    episodeMeta={ep.meta}
                    seekSeconds={seekForThumbnail(ep)}
                    cover={group.cover}
                    episodeNumber={ep.number}
                    progressPct={status.pct}
                    highlight={isContinueTarget}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-white sm:truncate">
                      {ep.title && ep.title !== `Серия ${ep.number}`
                        ? ep.title
                        : `Серия ${ep.number ?? '—'}`}
                    </p>
                    <p
                      className={`mt-1 text-xs ${
                        status.tone === 'done'
                          ? 'text-emerald-400/90'
                          : status.tone === 'progress'
                            ? 'text-accent'
                            : 'text-text-muted'
                      }`}
                    >
                      {status.label}
                      {ep.lastWatchedAt && (
                        <span className="text-text-muted">
                          {' '}
                          · {formatHistoryTime(ep.lastWatchedAt)}
                        </span>
                      )}
                    </p>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10 sm:hidden">
                      <div
                        className={`h-full rounded-full ${
                          status.tone === 'done' ? 'bg-emerald-400/80' : 'bg-accent'
                        }`}
                        style={{ width: `${status.pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="hidden w-16 shrink-0 sm:block">
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${
                          status.tone === 'done' ? 'bg-emerald-400/80' : 'bg-accent'
                        }`}
                        style={{ width: `${status.pct}%` }}
                      />
                    </div>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={async () => {
                    await removeCollectionEpisodeApi(group.animeId, ep.episodeId)
                    removeHistoryEpisode(group.animeId, ep.episodeId)
                    onRemoveEpisode?.({
                      animeId: group.animeId,
                      episodeId: ep.episodeId,
                    })
                  }}
                  className="shrink-0 rounded-lg p-2 text-text-muted transition hover:bg-white/10 hover:text-white"
                  aria-label="Убрать серию из истории"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </article>
  )
}
