import {
  CATALOG_YEAR_MAX,
  CATALOG_YEAR_MIN,
  DEFAULT_CATALOG_FILTERS,
} from '../constants/catalogFilters'
import { animeRatingNumber } from './displayRating'
import { resolveAnimeSeason, resolveAnimeType } from '../constants/animeMeta'

const AGE_VALUES = ['0+', '6+', '12+', '16+', '18+']

export function resolveAgeRating(anime) {
  if (AGE_VALUES.includes(anime?.ageRating)) return anime.ageRating
  return pseudoAgeRating(anime)
}

export function pseudoAgeRating(anime) {
  const ages = ['0+', '6+', '12+', '16+', '18+']
  const seed = String(anime?.id ?? '')
    .split('')
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return ages[seed % ages.length]
}

export function isAnimeOngoing(anime) {
  if (anime?.airingStatus === 'ongoing') return true
  if (anime?.airingStatus === 'finished') return false
  return Boolean(anime?.categories?.isNew)
}

export function parseListParam(param) {
  if (!param) return []
  return param
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function serializeListParam(list) {
  if (!list?.length) return null
  return list.join(',')
}

export function normalizeCatalogYearRange(
  yearMin,
  yearMax,
  min = CATALOG_YEAR_MIN,
  max = CATALOG_YEAR_MAX,
  gap = 1,
) {
  let lo = Number(yearMin)
  let hi = Number(yearMax)
  if (!Number.isFinite(lo)) lo = DEFAULT_CATALOG_FILTERS.yearMin
  if (!Number.isFinite(hi)) hi = DEFAULT_CATALOG_FILTERS.yearMax
  lo = Math.max(min, Math.min(lo, max))
  hi = Math.max(min, Math.min(hi, max))
  if (lo > hi - gap) {
    if (hi + gap <= max) hi = lo + gap
    else lo = Math.max(min, hi - gap)
  }
  return { yearMin: lo, yearMax: hi }
}

export function sortAnimeList(list, sortId) {
  const items = [...list]
  switch (sortId) {
    case 'updated_asc':
      return items.sort(
        (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
      )
    case 'rating_desc':
      return items.sort((a, b) => {
        const ra = animeRatingNumber(a)
        const rb = animeRatingNumber(b)
        if (ra == null && rb == null) return 0
        if (ra == null) return 1
        if (rb == null) return -1
        return rb - ra
      })
    case 'rating_asc':
      return items.sort((a, b) => {
        const ra = animeRatingNumber(a)
        const rb = animeRatingNumber(b)
        if (ra == null && rb == null) return 0
        if (ra == null) return 1
        if (rb == null) return -1
        return ra - rb
      })
    case 'year_desc':
      return items.sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    case 'year_asc':
      return items.sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
    case 'updated_desc':
    default:
      return items.sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      )
  }
}

export function matchesCatalogFilters(anime, filters) {
  const types = filters.types || []
  if (types.length > 0 && !types.includes(resolveAnimeType(anime))) return false

  const seasons = filters.seasons || []
  if (seasons.length > 0 && !seasons.includes(resolveAnimeSeason(anime))) return false

  const release = filters.releaseStatus || []
  if (release.length > 0) {
    const ongoing = isAnimeOngoing(anime)
    const ok =
      (release.includes('ongoing') && ongoing) ||
      (release.includes('finished') && !ongoing)
    if (!ok) return false
  }

  const year = anime.year ?? 0
  if (year && (year < filters.yearMin || year > filters.yearMax)) return false

  const ages = filters.ageRatings || []
  if (ages.length > 0 && !ages.includes(resolveAgeRating(anime))) return false

  return true
}
