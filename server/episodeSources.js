const QUALITY_RANK = {
  '1080p': 0,
  '720p': 1,
  '480p': 2,
  '360p': 3,
  '240p': 4,
  Оригинал: 5,
  Original: 5,
}

export function normalizeFileRef(fileRef) {
  return String(fileRef || '').replace(/\\/g, '/')
}

/** legacy file → sources[] */
export function normalizeEpisodeSources(ep) {
  if (Array.isArray(ep?.sources) && ep.sources.length > 0) {
    return ep.sources
      .filter((s) => s?.file)
      .map((s) => ({
        quality: s.quality || 'Оригинал',
        file: normalizeFileRef(s.file),
      }))
  }
  if (ep?.file) {
    return [{ quality: 'Оригинал', file: normalizeFileRef(ep.file) }]
  }
  return []
}

export function sortSourcesByQuality(sources) {
  return [...sources].sort((a, b) => {
    const ra = QUALITY_RANK[a.quality] ?? 50
    const rb = QUALITY_RANK[b.quality] ?? 50
    if (ra !== rb) return ra - rb
    return a.quality.localeCompare(b.quality, 'ru')
  })
}

export function computeWatchStats(episodes) {
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

  return { episodeDurationSeconds, totalWatchSeconds }
}

export function buildSourcesWithPaths(animeId, sources, mediaPathFn) {
  return sortSourcesByQuality(sources).map((s) => ({
    quality: s.quality,
    file: s.file,
    path: mediaPathFn(animeId, ...s.file.split('/').filter(Boolean)),
  }))
}
