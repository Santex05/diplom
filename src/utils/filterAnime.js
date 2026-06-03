import { hasCategory } from './categories'
import { normalizeGenreKey, genreLabel } from '../constants/genres'
import { matchesCatalogFilters, sortAnimeList } from './catalogFilterHelpers'

/**
 * Фильтр по нескольким жанрам: аниме должно содержать ВСЕ выбранные жанры (логика AND).
 */
export function filterAnimeList(animeList, options = {}) {
  const {
    category,
    genres: selectedGenres,
    search,
    types,
    releaseStatus,
    seasons,
    sort,
    yearMin,
    yearMax,
    ageRatings,
  } = options

  let list = [...animeList]

  if (category && category !== 'all') {
    list = list.filter((a) => hasCategory(a, category))
  }

  const genreKeys = (selectedGenres || []).map(normalizeGenreKey).filter(Boolean)

  if (genreKeys.length > 0) {
    list = list.filter((a) => {
      const animeKeys = (a.genres || []).map(normalizeGenreKey).filter(Boolean)
      return genreKeys.every((key) => animeKeys.includes(key))
    })
  }

  const q = search?.trim().toLowerCase()
  if (q) {
    list = list.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        (a.genres || []).some((g) => genreLabel(g).toLowerCase().includes(q)),
    )
  }

  list = list.filter((a) =>
    matchesCatalogFilters(a, {
      types: types || [],
      releaseStatus: releaseStatus || [],
      seasons: seasons || [],
      yearMin: yearMin ?? 1990,
      yearMax: yearMax ?? 2030,
      ageRatings: ageRatings || [],
    }),
  )

  return sortAnimeList(list, sort || 'updated_desc')
}

/** Уникальные ключи жанров из каталога, сортировка по русскому названию */
export function collectGenres(animeList) {
  const set = new Set()
  animeList.forEach((a) =>
    a.genres?.forEach((g) => {
      const key = normalizeGenreKey(g)
      if (key) set.add(key)
    }),
  )
  return [...set].sort((a, b) => genreLabel(a).localeCompare(genreLabel(b), 'ru'))
}

export function parseGenresParam(param) {
  if (!param) return []
  return param
    .split(',')
    .map((s) => normalizeGenreKey(s.trim()))
    .filter(Boolean)
}

export function serializeGenresParam(genres) {
  if (!genres?.length) return null
  return genres.map(normalizeGenreKey).filter(Boolean).join(',')
}
