/** Тип аниме (ключ в БД → подпись в UI) */
export const ANIME_TYPES = [
  { value: 'TV', label: 'ТВ' },
  { value: 'TV Special', label: 'ТВ-спешл' },
  { value: 'Movie', label: 'Фильм' },
  { value: 'OVA', label: 'OVA' },
  { value: 'ONA', label: 'ONA' },
  { value: 'Music', label: 'Клип' },
]

export const ANIME_SEASONS = [
  { value: 'Winter', label: 'Зима' },
  { value: 'Spring', label: 'Весна' },
  { value: 'Summer', label: 'Лето' },
  { value: 'Fall', label: 'Осень' },
]

export function resolveAnimeType(anime) {
  return anime?.type || anime?.animeType || 'TV'
}

export function resolveAnimeSeason(anime) {
  const s = anime?.season ?? anime?.releaseSeason
  return s || ''
}

export function animeTypeLabel(value) {
  return ANIME_TYPES.find((t) => t.value === value)?.label || value || '—'
}

export function animeSeasonLabel(value) {
  return ANIME_SEASONS.find((s) => s.value === value)?.label || value || '—'
}

/** Только минуты и часы, без секунд */
export function formatDurationRu(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return null
  const totalMin = Math.max(1, Math.round(seconds / 60))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) {
    const hWord = h === 1 ? 'час' : h < 5 ? 'часа' : 'часов'
    const mPart = m > 0 ? `, ${m} ${m === 1 ? 'минута' : m < 5 ? 'минуты' : 'минут'}` : ''
    return `${h} ${hWord}${mPart}`
  }
  return `~ ${m} мин`
}

/**
 * Длительность серии — среднее по известным сериям (для 1 серии = её длительность).
 * Общее время — сумма всех серий; для серий без длительности — оценка по среднему.
 */
export function computeWatchStats(episodes = []) {
  const list = episodes || []
  const durations = list
    .map((ep) => ep.durationSeconds)
    .filter((d) => Number.isFinite(d) && d > 0)

  const episodeDurationSeconds =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null

  let totalWatchSeconds = null
  if (list.length > 0 && durations.length > 0) {
    const sum = durations.reduce((a, b) => a + b, 0)
    const missing = list.length - durations.length
    totalWatchSeconds =
      missing > 0 && episodeDurationSeconds
        ? sum + episodeDurationSeconds * missing
        : sum
  }

  return { episodeDurationSeconds, totalWatchSeconds, knownCount: durations.length }
}
