import { findAnimeById, findEpisode } from './watch'

/** Добавляет метаданные серии из каталога для превью и видео */
export function enrichHistorySections(sections, animeList) {
  return sections.map((section) => ({
    ...section,
    items: section.items.map((group) => {
      const anime = findAnimeById(animeList, group.animeId)
      return {
        ...group,
        episodes: group.episodes.map((ep) => ({
          ...ep,
          meta: findEpisode(anime, ep.episodeId)?.episode ?? null,
        })),
      }
    }),
  }))
}
