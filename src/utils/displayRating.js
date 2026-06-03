/** Числовой средний рейтинг из ответа API (или null, если оценок нет) */
export function animeRatingNumber(anime) {
  const raw =
    anime?.ratingAverage ??
    anime?.averageRating ??
    (typeof anime?.rating === 'number' ? anime.rating : anime?.rating?.average)

  if (raw == null || raw === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 10) / 10
}

/** Строка для бейджа: «8.4» или null */
export function displayRating(anime) {
  const n = animeRatingNumber(anime)
  return n != null ? n.toFixed(1) : null
}

export function averageDisplayRating(list) {
  if (!list?.length) return '—'
  const values = list.map(animeRatingNumber).filter((n) => n != null)
  if (!values.length) return '—'
  const sum = values.reduce((acc, n) => acc + n, 0)
  return (sum / values.length).toFixed(1)
}

export function totalRatingCount(list) {
  if (!list?.length) return 0
  return list.reduce((acc, a) => acc + (Number(a?.ratingCount) || 0), 0)
}

export function ratingCountLabel(count) {
  const n = Math.abs(Number(count)) || 0
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'оценка'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'оценки'
  return 'оценок'
}
