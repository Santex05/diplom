import { genreLabel } from '../constants/genres'
import {
  animeTypeLabel,
  animeSeasonLabel,
  resolveAnimeType,
  resolveAnimeSeason,
  formatDurationRu,
  computeWatchStats,
} from '../constants/animeMeta'

function MetaRow({ label, children }) {
  return (
    <p className="text-sm text-[#9ca3af]">
      <span className="text-[#6b7280]">{label}: </span>
      <span className="font-medium text-white">{children}</span>
    </p>
  )
}

export default function AnimeMetaBlock({ anime }) {
  if (!anime) return null

  const genres = (anime.genres ?? []).map(genreLabel).join(' • ')
  const fromEps = computeWatchStats(anime.episodes)
  const epDuration =
    anime.episodeDurationSeconds > 0
      ? anime.episodeDurationSeconds
      : fromEps.episodeDurationSeconds
  const totalWatch =
    anime.totalWatchSeconds > 0 ? anime.totalWatchSeconds : fromEps.totalWatchSeconds
  const typeLabel = animeTypeLabel(resolveAnimeType(anime))
  const seasonValue = resolveAnimeSeason(anime)

  return (
    <div className="mt-5 space-y-1.5 rounded-xl border border-white/10 bg-[#141820]/60 px-4 py-3">
      <MetaRow label="Тип">{typeLabel}</MetaRow>
      <MetaRow label="Сезон">
        {seasonValue ? animeSeasonLabel(seasonValue) : 'Не указан'}
      </MetaRow>
      {genres && <MetaRow label="Жанры">{genres}</MetaRow>}
      {anime.year && <MetaRow label="Год выхода">{anime.year}</MetaRow>}
      {epDuration > 0 && (
        <MetaRow label="Длительность серии">{formatDurationRu(epDuration)}</MetaRow>
      )}
      {totalWatch > 0 && (anime.episodeCount > 0 || (anime.episodes?.length ?? 0) > 0) && (
        <MetaRow label="Общее время просмотра">{formatDurationRu(totalWatch)}</MetaRow>
      )}
    </div>
  )
}
