import { watchPath, firstEpisodeId } from './watch'

export function animeDetailPath(animeId) {
  return `/anime/${encodeURIComponent(animeId)}`
}

export function goWatchEpisode(navigate, anime, episodeId, opts = {}) {
  if (!anime?.id || !episodeId) return
  navigate(watchPath(anime.id, episodeId), {
    state: {
      anime,
      autoPlay: opts.autoPlay ?? true,
      requestFullscreen: opts.requestFullscreen ?? false,
    },
  })
}

export function goWatchFirst(navigate, anime, opts = {}) {
  const epId = firstEpisodeId(anime)
  if (!epId) return
  goWatchEpisode(navigate, anime, epId, {
    autoPlay: opts.autoPlay ?? false,
    requestFullscreen: opts.requestFullscreen ?? false,
  })
}

export function goWatchFromQueue(navigate, anime, opts = {}) {
  const epId = opts.episodeId || firstEpisodeId(anime)
  if (!epId) return
  goWatchEpisode(navigate, anime, epId, {
    autoPlay: true,
    requestFullscreen: opts.requestFullscreen ?? false,
  })
}
