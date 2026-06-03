/** Серия считается просмотренной: ~88%+ или осталось ≤2 мин (для ~23 мин это ~21+ мин) */
export function isEpisodeCompleted(currentTime, duration) {
  const dur = Number(duration)
  const time = Number(currentTime)
  if (!dur || dur <= 0 || !Number.isFinite(time) || time < 60) return false
  const remaining = dur - time
  return remaining <= 120 || time / dur >= 0.88
}

export function progressPercent(current, duration) {
  if (!duration || duration <= 0) return 0
  return Math.min(100, Math.round((current / duration) * 100))
}
