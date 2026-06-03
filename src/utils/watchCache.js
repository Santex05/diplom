/** Кэш загрузки аниме для страницы просмотра — без повторных запросов при ре-рендере */
const cache = new Map()

export function getCachedAnime(animeId) {
  if (!animeId) return null
  return cache.get(animeId) ?? null
}

export function setCachedAnime(animeId, data) {
  if (!animeId || !data) return
  cache.set(animeId, data)
}

export function clearWatchCache() {
  cache.clear()
}
