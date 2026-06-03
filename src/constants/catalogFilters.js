export const CATALOG_TYPE_OPTIONS = [
  { value: 'TV', label: 'ТВ' },
  { value: 'ONA', label: 'ONA' },
  { value: 'OVA', label: 'OVA' },
  { value: 'TV Special', label: 'Спешл' },
  { value: 'Movie', label: 'Фильм' },
]

export const RELEASE_STATUS_OPTIONS = [
  { id: 'ongoing', label: 'Онгоинг' },
  { id: 'finished', label: 'Завершён' },
]

export const AGE_RATING_OPTIONS = ['0+', '6+', '12+', '16+', '18+']

export const SORT_OPTIONS = [
  {
    id: 'updated_desc',
    label: 'Обновлены недавно',
    hint: 'Сначала самые новые по дате добавления',
  },
  {
    id: 'updated_asc',
    label: 'Обновлены давно',
    hint: 'Сначала самые старые по дате добавления',
  },
  {
    id: 'rating_desc',
    label: 'Самый высокий рейтинг',
    hint: 'Сначала самые популярные релизы',
  },
  {
    id: 'rating_asc',
    label: 'Самый низкий рейтинг',
    hint: 'Сначала менее популярные',
  },
  {
    id: 'year_desc',
    label: 'Самые новые',
    hint: 'Сначала релизы с более поздним годом',
  },
  {
    id: 'year_asc',
    label: 'Самые старые',
    hint: 'Сначала релизы с более ранним годом',
  },
]

export const CATALOG_YEAR_MIN = 1995
export const CATALOG_YEAR_MAX = new Date().getFullYear() + 1

export const DEFAULT_CATALOG_FILTERS = {
  search: '',
  genres: [],
  types: [],
  releaseStatus: [],
  seasons: [],
  sort: 'updated_desc',
  yearMin: CATALOG_YEAR_MIN,
  yearMax: CATALOG_YEAR_MAX,
  ageRatings: [],
  category: 'all',
}
