export const CATEGORIES = [
  {
    id: 'all',
    label: 'Все',
    title: 'Каталог',
    subtitle: 'Весь каталог аниме',
  },
  {
    id: 'new',
    label: 'Новинки сезона',
    title: 'Новинки сезона',
    subtitle: 'Свежие релизы и новые серии',
  },
  {
    id: 'popular',
    label: 'Популярное',
    title: 'Популярное сейчас',
    subtitle: 'То, что смотрят чаще всего',
  },
  {
    id: 'recommended',
    label: 'Рекомендуем',
    title: 'Может понравиться',
    subtitle: 'Подборка под ваш вкус',
  },
]

export function getCategoryMeta(id) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0]
}

export const SORT_OPTIONS = [
  { id: 'popularity', label: 'По популярности' },
  { id: 'year', label: 'По году' },
  { id: 'title', label: 'По названию' },
]

export const PAGE_SIZE = 18
