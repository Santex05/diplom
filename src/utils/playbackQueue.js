const QUEUE_KEY = 'anicatalog_playback_queue'

export function loadPlaybackQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function savePlaybackQueue(items) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event('anicatalog-queue'))
}

export function queueEntryId(animeId, episodeId = null) {
  if (episodeId != null && episodeId !== '') {
    return `${String(animeId)}::${String(episodeId)}`
  }
  return String(animeId)
}

export function parseQueueEntryId(id) {
  const s = String(id)
  const i = s.indexOf('::')
  if (i < 0) return { animeId: s, episodeId: null }
  return { animeId: s.slice(0, i), episodeId: s.slice(i + 2) }
}
