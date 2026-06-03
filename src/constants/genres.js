/** Ключи жанров в данных (EN) → подписи в UI (RU) */
export const GENRE_LABELS = {
  Action: 'Экшен',
  Adventure: 'Приключения',
  Comedy: 'Комедия',
  Drama: 'Драма',
  Fantasy: 'Фэнтези',
  Horror: 'Хоррор',
  Romance: 'Романтика',
  'Sci-Fi': 'Научная фантастика',
  'Slice of Life': 'Повседневность',
  Thriller: 'Триллер',
  Mecha: 'Меха',
  Mystery: 'Детектив',
  Sports: 'Спорт',
  Supernatural: 'Сверхъестественное',
  Isekai: 'Исекай',
  Shounen: 'Сёнен',
  Shoujo: 'Сёдзё',
  Seinen: 'Сэйнэн',
  Josei: 'Дзёсэй',
  Psychological: 'Психологическое',
  Military: 'Военное',
  Historical: 'Историческое',
  School: 'Школа',
  'Martial Arts': 'Боевые искусства',
  Demons: 'Демоны',
  Vampire: 'Вампиры',
  Harem: 'Гарем',
  Ecchi: 'Этти',
  Parody: 'Пародия',
  Music: 'Музыка',
  Game: 'Игры',
  Space: 'Космос',
  Samurai: 'Самураи',
  Gourmet: 'Гурман',
}

/** Все известные ключи (для админки и подсказок) */
export const ALL_GENRE_KEYS = Object.keys(GENRE_LABELS)

const KEY_BY_LOWER = Object.fromEntries(
  ALL_GENRE_KEYS.map((k) => [k.toLowerCase(), k]),
)

const KEY_BY_RU_LABEL = Object.fromEntries(
  Object.entries(GENRE_LABELS).map(([k, label]) => [label.toLowerCase(), k]),
)

/** Приводит значение из БД к каноническому ключу (Action, Fantasy, …) */
export function normalizeGenreKey(value) {
  if (!value) return ''
  const s = String(value).trim()
  if (KEY_BY_LOWER[s.toLowerCase()]) return KEY_BY_LOWER[s.toLowerCase()]
  if (KEY_BY_RU_LABEL[s.toLowerCase()]) return KEY_BY_RU_LABEL[s.toLowerCase()]
  return s
}

/** Русская подпись для ключа или сырого значения */
export function genreLabel(value) {
  const key = normalizeGenreKey(value)
  return GENRE_LABELS[key] || value || ''
}

/** «Экшен · Фэнтези» */
export function formatGenresList(genres, max = 3, separator = ' · ') {
  if (!genres?.length) return ''
  return genres
    .slice(0, max)
    .map((g) => genreLabel(g))
    .filter(Boolean)
    .join(separator)
}
