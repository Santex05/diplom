import { STICKY_BELOW_NAV } from '../../constants/layout'
import { genreLabel } from '../../constants/genres'
import {
  animeTypeLabel,
  animeSeasonLabel,
  resolveAnimeType,
  resolveAnimeSeason,
  formatDurationRu,
  computeWatchStats,
} from '../../constants/animeMeta'

function DetailRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] py-3 last:border-0">
      <span className="text-xs font-medium uppercase tracking-wider text-text-muted">{label}</span>
      <span className="text-right text-sm font-medium text-white">{value}</span>
    </div>
  )
}

export default function AnimeDetailsSidebar({ anime }) {
  if (!anime) return null

  const fromEps = computeWatchStats(anime.episodes)
  const epDuration =
    anime.episodeDurationSeconds > 0
      ? anime.episodeDurationSeconds
      : fromEps.episodeDurationSeconds
  const totalWatch =
    anime.totalWatchSeconds > 0 ? anime.totalWatchSeconds : fromEps.totalWatchSeconds
  const typeLabel = animeTypeLabel(resolveAnimeType(anime))
  const seasonValue = resolveAnimeSeason(anime)
  const genres = (anime.genres ?? []).map(genreLabel).join(', ')

  return (
    <aside className={`space-y-5 lg:sticky lg:self-start ${STICKY_BELOW_NAV}`}>
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-bg-card/80 backdrop-blur-sm">
        <div className="border-b border-white/[0.06] px-5 py-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-accent">
            Детали
          </h2>
        </div>
        <div className="px-5 py-1">
          <DetailRow label="Тип" value={typeLabel} />
          <DetailRow
            label="Статус"
            value={anime.status === 'finished' ? 'Завершён' : anime.status || 'В каталоге'}
          />
          <DetailRow label="Сезон" value={seasonValue ? animeSeasonLabel(seasonValue) : null} />
          <DetailRow label="Год" value={anime.year ? String(anime.year) : null} />
          <DetailRow label="Жанры" value={genres || null} />
          <DetailRow
            label="Серия"
            value={epDuration > 0 ? formatDurationRu(epDuration) : null}
          />
          <DetailRow
            label="Всего"
            value={
              totalWatch > 0 && (anime.episodeCount > 0 || anime.episodes?.length)
                ? formatDurationRu(totalWatch)
                : null
            }
          />
        </div>
      </div>
    </aside>
  )
}
