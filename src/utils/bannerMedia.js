/** Публичный путь к постеру аниме (admin API отдаёт poster, public API — cover). */
export function animeCoverPath(anime) {
  if (!anime) return null
  if (anime.cover) return anime.cover
  if (anime.poster && anime.id) {
    return `/media/${encodeURIComponent(anime.id)}/${encodeURIComponent(anime.poster)}`
  }
  return null
}

/** Версия из имени файла вида 1779831706535_banner.mp4 */
function versionFromFilename(filename) {
  const match = /^(\d{10,})_/.exec(filename || '')
  return match ? match[1] : ''
}

/** Публичный путь к загруженному медиа баннера (всегда с ?v= для сброса кеша браузера). */
export function bannerMediaPath(slide) {
  if (!slide?.image || !slide?.id) return null
  const base = `/media/banners/${encodeURIComponent(slide.id)}/${encodeURIComponent(slide.image)}`
  const version = slide.mediaVersion || versionFromFilename(slide.image) || slide.image
  return `${base}?v=${encodeURIComponent(String(version))}`
}

export function isUploadedBannerMedia(src) {
  return typeof src === 'string' && src.includes('/media/banners/')
}

/** Добавляет/обновляет параметр v= в URL медиа (для сброса кеша). */
export function withMediaCacheBust(url, version) {
  if (!url) return ''
  if (!version) return url
  try {
    const base = url.startsWith('http') ? url : `http://local${url}`
    const parsed = new URL(base, 'http://local')
    parsed.searchParams.set('v', String(version))
    return url.startsWith('http') ? parsed.toString() : `${parsed.pathname}${parsed.search}`
  } catch {
    const sep = url.includes('?') ? '&' : '?'
    return `${url}${sep}v=${encodeURIComponent(String(version))}`
  }
}
