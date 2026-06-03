/** Проверка категории из config.categories или legacy categories[] */
export function hasCategory(anime, key) {
  if (!anime) return false
  const c = anime.categories
  if (c && typeof c === 'object' && !Array.isArray(c)) {
    if (key === 'new') return Boolean(c.isNew)
    if (key === 'popular') return Boolean(c.isPopular)
    if (key === 'recommended') return Boolean(c.isRecommended)
  }
  if (Array.isArray(c)) return c.includes(key)
  return false
}

export function filterByCategory(list, category) {
  if (!category || category === 'all') return list
  return list.filter((a) => hasCategory(a, category))
}
