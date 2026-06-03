import { mediaUrl } from '../api'

const QUALITY_RANK = {
  '1080p': 0,
  '720p': 1,
  '480p': 2,
  '360p': 3,
  '240p': 4,
  Оригинал: 5,
  Original: 5,
}

/** Путь к файлу в /media (animeId + segments из file) */
export function buildMediaPath(animeId, fileRef) {
  if (!animeId || !fileRef) return null
  const parts = String(fileRef).replace(/\\/g, '/').split('/').filter(Boolean)
  return `/media/${[animeId, ...parts].map((s) => encodeURIComponent(s)).join('/')}`
}

/** Нормализация серии из API (sources или legacy file/path) */
export function getEpisodeSources(episode, animeId) {
  if (!episode) return []
  if (Array.isArray(episode.sources) && episode.sources.length > 0) {
    return episode.sources
      .filter((s) => s?.path || s?.file)
      .map((s) => ({
        quality: s.quality || 'Оригинал',
        file: s.file,
        path: s.path || (animeId ? buildMediaPath(animeId, s.file) : null),
      }))
      .sort(sortByQuality)
  }
  if (episode.path) {
    return [{ quality: 'Оригинал', path: episode.path, file: episode.file }]
  }
  if (episode.file && animeId) {
    return [{ quality: 'Оригинал', file: episode.file, path: buildMediaPath(animeId, episode.file) }]
  }
  return []
}

export function sortByQuality(a, b) {
  const ra = QUALITY_RANK[a.quality] ?? 50
  const rb = QUALITY_RANK[b.quality] ?? 50
  if (ra !== rb) return ra - rb
  return String(a.quality).localeCompare(String(b.quality), 'ru')
}

export function defaultSource(episode, animeId) {
  const list = getEpisodeSources(episode, animeId)
  return list[0] || null
}

export function hasMultipleQualities(episode, animeId) {
  return getEpisodeSources(episode, animeId).length > 1
}

export function sourcePlaybackUrl(source) {
  if (!source?.path) return ''
  return mediaUrl(source.path)
}

