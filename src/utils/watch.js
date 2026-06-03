/**
 * Эпизод из API: { id, number, title, description, file, path, durationSeconds }
 * Текущая серия в URL выбирается по episode.id (см. watchPath / findEpisode).
 */

export function findAnimeById(animeList, animeId) {
  if (!animeId || !animeList?.length) return null
  const decoded = tryDecode(animeId)

  return animeList.find((a) => {
    if (a.id === animeId || a.id === decoded) return true
    if (tryDecode(a.id) === decoded) return true
    return false
  })
}

export function findEpisode(anime, episodeIdParam) {
  if (!anime?.episodes?.length || episodeIdParam == null) return null

  const param = tryDecode(String(episodeIdParam))

  let index = anime.episodes.findIndex((ep) => String(ep.id) === param)
  if (index < 0) {
    index = anime.episodes.findIndex((ep) => String(ep.number) === param)
  }
  if (index < 0 && /^\d+$/.test(param)) {
    const num = parseInt(param, 10)
    index = anime.episodes.findIndex((ep) => Number(ep.number) === num)
  }

  if (index < 0) return null
  return { episode: anime.episodes[index], index }
}

export function watchPath(animeId, episodeId) {
  const a = encodeURIComponent(animeId)
  const e = encodeURIComponent(String(episodeId))
  return `/watch/${a}/${e}`
}

export function firstEpisodeId(anime) {
  if (!anime?.episodes?.length) return null
  const sorted = [...anime.episodes].sort(
    (a, b) => (a.number ?? 0) - (b.number ?? 0),
  )
  return sorted[0].id
}

function tryDecode(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
