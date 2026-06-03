import { Link } from 'react-router-dom'
import { mediaUrl } from '../../api'
import AnimePoster from '../AnimePoster'
import AnimeActionBar from '../anime/AnimeActionBar'
import AnimeRatingBlock from './AnimeRatingBlock'
import { genreLabel } from '../../constants/genres'
import {
  animeTypeLabel,
  animeSeasonLabel,
  resolveAnimeType,
  resolveAnimeSeason,
  formatDurationRu,
  computeWatchStats,
} from '../../constants/animeMeta'
import { resolveAgeRating } from '../../utils/catalogFilterHelpers'
import { getContinueEpisode, getNextEpisodeToWatch } from '../../utils/playerStorage'

function MetaRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-2 text-sm">
      <span className="w-36 shrink-0 text-text-muted">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  )
}

export default function AnimeDetailHero({
  anime,
  episodeCount,
  onWatchFromFirst,
  onContinueWatch,
  shareUrl,
}) {
  const stats = computeWatchStats(anime.episodes)
  const typeLabel = animeTypeLabel(resolveAnimeType(anime))
  const season = resolveAnimeSeason(anime)
  const age = resolveAgeRating(anime)
  const genres = (anime.genres ?? []).map(genreLabel).join(' • ')
  const epDur = formatDurationRu(
    anime.episodeDurationSeconds > 0
      ? anime.episodeDurationSeconds
      : stats.episodeDurationSeconds,
  )
  const totalWatch =
    anime.totalWatchSeconds > 0 ? anime.totalWatchSeconds : stats.totalWatchSeconds

  const continueInfo = getContinueEpisode(anime.id, anime.episodes || [])
  const nextInfo = getNextEpisodeToWatch(anime.id, anime.episodes || [])
  const hasResume = Boolean(continueInfo)

  const watchHandler = hasResume
    ? () => onContinueWatch?.(continueInfo)
    : () => {
        if (nextInfo?.episode) onContinueWatch?.({ episode: nextInfo.episode })
        else onWatchFromFirst?.()
      }

  const watchLabel = hasResume
    ? `Продолжить · ${continueInfo.episode.number} эпизод`
    : `Смотреть с ${nextInfo?.episode?.number ?? 1} эпизода`
  const bgVideo = anime.backgroundVideo ? mediaUrl(anime.backgroundVideo) : null

  return (
    <section className="relative overflow-hidden border-b border-white/[0.06]">
      {bgVideo && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[min(420px,55vh)] overflow-hidden">
          <video src={bgVideo} className="h-full w-full object-cover opacity-40" autoPlay muted loop playsInline />
          <div className="absolute inset-0 bg-gradient-to-r from-bg-dark via-bg-dark/85 to-bg-dark/70" />
          <div className="absolute inset-0 bg-gradient-to-b from-bg-dark/30 via-transparent to-bg-dark" />
        </div>
      )}
      {!bgVideo && (
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-accent/5 to-transparent" />
      )}

      <div className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-text-muted">
          <Link to="/" className="hover:text-accent">Главная</Link>
          <span>/</span>
          <Link to="/catalog" className="hover:text-accent">Каталог</Link>
          <span>/</span>
          <span className="text-white/80">{anime.title}</span>
        </nav>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="mx-auto w-full max-w-[200px] shrink-0 lg:mx-0 lg:max-w-[220px]">
            <div className="overflow-hidden rounded-xl border border-white/10 shadow-xl">
              <AnimePoster cover={anime.cover} alt={anime.title} className="aspect-[2/3] w-full" imgClassName="aspect-[2/3] w-full object-cover" />
            </div>
            <AnimeRatingBlock animeId={anime.id} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="rounded-xl border border-white/15 bg-white/5 px-2 py-0.5 text-xs font-bold text-white">{age}</span>
              {season && (
                <span className="rounded-xl border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                  {animeSeasonLabel(season)}
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl font-bold text-white md:text-4xl">{anime.title}</h1>
            <div className="mt-6 max-w-lg divide-y divide-white/[0.06]">
              <MetaRow label="Тип" value={typeLabel} />
              <MetaRow label="Сезон" value={season ? animeSeasonLabel(season) : null} />
              <MetaRow label="Жанры" value={genres || null} />
              <MetaRow label="Год выхода" value={anime.year ? String(anime.year) : null} />
              <MetaRow label="Общее время" value={totalWatch > 0 ? formatDurationRu(totalWatch) : episodeCount ? `${episodeCount} сер.` : null} />
              {epDur && <MetaRow label="Длина серии" value={epDur} />}
            </div>
            <div className="mt-5">
              <AnimeActionBar
                anime={anime}
                onWatch={watchHandler}
                showWatch
                showDetails={false}
                showShare={Boolean(shareUrl)}
                shareUrl={shareUrl}
                shareLinkOnly
                watchLabel={watchLabel}
                watchStacked
                watchDisabled={!episodeCount}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
