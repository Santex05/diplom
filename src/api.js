import { getAdminToken, clearAdminToken } from './utils/adminAuth'
import { cachedFetch, CACHE_TTL, invalidateCache } from './utils/apiCache'

const API_BASE = import.meta.env.VITE_API_URL || ''

export { invalidateCache }

function adminHeaders(json = true) {
  const headers = {}
  const token = getAdminToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (json) headers['Content-Type'] = 'application/json'
  return headers
}

export async function fetchAnime(options = {}) {
  return cachedFetch(
    'catalog',
    async () => {
      const res = await fetch(`${API_BASE}/api/anime`)
      if (!res.ok) throw new Error('Не удалось загрузить каталог')
      return res.json()
    },
    { ttl: CACHE_TTL.catalog, force: options.force },
  )
}

export async function fetchHomeBanners(options = {}) {
  return cachedFetch(
    'banners',
    async () => {
      const res = await fetch(`${API_BASE}/api/home-banners`, { cache: 'no-store' })
      if (!res.ok) return []
      return res.json()
    },
    { ttl: CACHE_TTL.banners, force: options.force },
  )
}

export async function fetchAuthPageConfig() {
  const res = await fetch(`${API_BASE}/api/auth-page`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

export async function fetchAnimeById(animeId, options = {}) {
  const id = String(animeId)
  return cachedFetch(
    `anime:${id}`,
    async () => {
      const res = await fetch(`${API_BASE}/api/anime/${encodeURIComponent(id)}`, {
        signal: options.signal,
      })
      if (!res.ok) throw new Error('Аниме не найдено')
      return res.json()
    },
    { ttl: CACHE_TTL.anime, force: options.force },
  )
}

export async function reportEpisodeDuration(animeId, episodeId, durationSeconds) {
  if (!durationSeconds || durationSeconds <= 0) return
  try {
    await fetch(
      `${API_BASE}/api/anime/${encodeURIComponent(animeId)}/episodes/${encodeURIComponent(episodeId)}/duration`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationSeconds: Math.round(durationSeconds) }),
      },
    )
  } catch {
    /* не критично */
  }
}

export async function fetchEpisode(animeId, episodeId) {
  const res = await fetch(
    `${API_BASE}/api/anime/${encodeURIComponent(animeId)}/episodes/${encodeURIComponent(episodeId)}`,
  )
  if (!res.ok) throw new Error('Серия не найдена')
  return res.json()
}

export function mediaUrl(path) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  // Медиа всегда через тот же origin (Vite proxy в dev) — иначе картинки/видео не грузятся
  if (path.startsWith('/media/')) {
    return path
  }
  return `${API_BASE}${path}`
}

export async function checkServerHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`)
    if (!res.ok) return { ok: false }
    const data = await res.json().catch(() => ({}))
    return {
      ok: Boolean(data.admin),
      apiVersion: Number(data.apiVersion) || 1,
      ...data,
    }
  } catch {
    return { ok: false }
  }
}

export async function adminLogin(login, password) {
  let res
  try {
    res = await fetch(`${API_BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: String(login).trim(),
        password: String(password).trim(),
      }),
    })
  } catch {
    throw new Error(
      'Сервер недоступен. Запустите в отдельном терминале: cd server && npm run dev',
    )
  }
  const data = await res.json().catch(() => ({}))
  if (res.status === 404) {
    throw new Error(
      'На порту 3001 запущен старый сервер без админки. Остановите его и выполните: cd server && npm run dev',
    )
  }
  if (!res.ok) throw new Error(data.error || 'Неверный логин или пароль')
  return data
}

/** Проверка, что админ-токен ещё действителен на сервере */
export async function adminVerifySession() {
  return adminJson('/api/admin/session', { cache: 'no-store' })
}

export async function adminLogout() {
  const token = getAdminToken()
  if (!token) return
  try {
    await fetch(`${API_BASE}/api/admin/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    /* сеть недоступна — всё равно сбрасываем локально */
  } finally {
    clearAdminToken()
  }
}

async function adminJson(url, options = {}) {
  const token = getAdminToken()
  if (!token) throw new Error('Войдите в админку')
  const { headers: extraHeaders, ...fetchOptions } = options
  const res = await fetch(`${API_BASE}${url}`, {
    ...fetchOptions,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  })
  const data = await parseAdminResponse(res)
  if (res.status === 401) {
    clearAdminToken()
    throw new Error('Сессия истекла. Войдите снова.')
  }
  if (!res.ok) throw new Error(data.error || 'Ошибка запроса')
  return data
}

async function parseAdminResponse(res) {
  const contentType = res.headers.get('content-type') || ''
  const text = await res.text()
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text)
    } catch {
      return {}
    }
  }
  if (text.includes('<!DOCTYPE') || text.includes('<html')) {
    if (res.status === 404 || text.includes('Cannot POST') || text.includes('Cannot GET')) {
      throw new Error(
        'API-сервер устарел или не запущен. Остановите процесс на порту 3001 и выполните: cd server && npm run dev',
      )
    }
    throw new Error(`Сервер вернул HTML вместо JSON (${res.status}). Перезапустите server.`)
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(text.slice(0, 120) || `Ошибка сервера (${res.status})`)
  }
}

/**
 * Загрузка FormData с отслеживанием прогресса (только XHR).
 * onProgress: { phase: 'upload'|'processing', percent: 0–100 | null }
 */
function adminFormUpload(url, formData, { onProgress } = {}) {
  const token = getAdminToken()
  if (!token) return Promise.reject(new Error('Войдите в админку'))

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}${url}`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.addEventListener('progress', (e) => {
      if (!onProgress) return
      if (e.lengthComputable && e.total > 0) {
        const pct = Math.min(85, Math.round((e.loaded / e.total) * 85))
        onProgress({ phase: 'upload', percent: pct })
      } else {
        onProgress({ phase: 'upload', percent: null })
      }
    })

    xhr.upload.addEventListener('loadend', () => {
      onProgress?.({ phase: 'processing', percent: 90 })
    })

    xhr.addEventListener('load', () => {
      onProgress?.({ phase: 'processing', percent: 95 })
      const status = xhr.status
      const contentType = xhr.getResponseHeader('content-type') || ''
      const text = xhr.responseText || ''

      const parseBody = () => {
        if (contentType.includes('application/json')) {
          try {
            return JSON.parse(text)
          } catch {
            return {}
          }
        }
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          if (status === 404 || text.includes('Cannot POST') || text.includes('Cannot GET')) {
            throw new Error(
              'API-сервер устарел или не запущен. Остановите процесс на порту 3001 и выполните: cd server && npm run dev',
            )
          }
          throw new Error(`Сервер вернул HTML вместо JSON (${status}). Перезапустите server.`)
        }
        try {
          return JSON.parse(text)
        } catch {
          throw new Error(text.slice(0, 120) || `Ошибка сервера (${status})`)
        }
      }

      try {
        const data = parseBody()
        if (status === 401) {
          clearAdminToken()
          reject(new Error('Сессия истекла. Войдите снова.'))
          return
        }
        if (status < 200 || status >= 300) {
          reject(new Error(data.error || `Ошибка загрузки (${status})`))
          return
        }
        onProgress?.({ phase: 'processing', percent: 100 })
        resolve(data)
      } catch (err) {
        reject(err)
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Сеть недоступна при загрузке файла'))
    })
    xhr.addEventListener('abort', () => {
      reject(new Error('Загрузка отменена'))
    })

    xhr.send(formData)
  })
}

async function adminForm(url, formData, options = {}) {
  if (options.onProgress) {
    return adminFormUpload(url, formData, options)
  }
  const token = getAdminToken()
  if (!token) throw new Error('Войдите в админку')
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  const data = await parseAdminResponse(res)
  if (res.status === 401) {
    clearAdminToken()
    throw new Error('Сессия истекла. Войдите снова.')
  }
  if (!res.ok) throw new Error(data.error || `Ошибка загрузки (${res.status})`)
  return data
}

export async function adminFetchAnime() {
  return adminJson('/api/admin/anime', { cache: 'no-store' })
}

export async function adminCreateAnime(payload) {
  return adminJson('/api/admin/anime', { method: 'POST', body: JSON.stringify(payload) })
}

export async function adminUpdateAnime(id, payload) {
  return adminJson(`/api/admin/anime/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

/** Сохранение типа, сезона и прочих полей без загрузки серий */
export async function adminUpdateAnimeMeta(id, payload) {
  return adminJson(`/api/admin/anime/${encodeURIComponent(id)}/meta`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function adminDeleteAnime(id) {
  return adminJson(`/api/admin/anime/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function adminBulkDeleteAnime(ids) {
  return adminJson('/api/admin/anime/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  })
}

export async function adminUploadPoster(animeId, file) {
  const fd = new FormData()
  fd.append('poster', file)
  return adminForm(`/api/admin/anime/${encodeURIComponent(animeId)}/poster`, fd)
}

export async function adminUploadBackground(animeId, file) {
  const fd = new FormData()
  fd.append('background', file)
  return adminForm(`/api/admin/anime/${encodeURIComponent(animeId)}/background`, fd)
}

function appendSkipFields(fd, fields = {}) {
  const keys = ['openingStartSeconds', 'openingEndSeconds', 'endingStartSeconds', 'endingEndSeconds']
  for (const key of keys) {
    if (fields[key] != null && fields[key] !== '') {
      fd.append(key, String(fields[key]))
    }
  }
}

/** Одно видео (legacy) или несколько качеств */
export async function adminAddEpisode(animeId, fields, videoOrQualities, options = {}) {
  const fd = new FormData()
  fd.append('number', String(fields.number || 1))
  fd.append('title', fields.title || `Серия ${fields.number || 1}`)
  fd.append('description', fields.description || '')
  appendSkipFields(fd, fields)

  if (Array.isArray(videoOrQualities)) {
    const qualities = videoOrQualities.map((q) => q.quality)
    fd.append('qualities', JSON.stringify(qualities))
    videoOrQualities.forEach((q) => {
      if (q.videoFile) fd.append('videos', q.videoFile)
    })
  } else if (videoOrQualities) {
    fd.append('video', videoOrQualities)
    fd.append('qualities', JSON.stringify(['Оригинал']))
  }

  return adminForm(`/api/admin/anime/${encodeURIComponent(animeId)}/episodes`, fd, options)
}

export async function adminAddEpisodeSource(animeId, episodeId, quality, videoFile, options = {}) {
  const fd = new FormData()
  fd.append('video', videoFile)
  fd.append('quality', quality)
  return adminForm(
    `/api/admin/anime/${encodeURIComponent(animeId)}/episodes/${encodeURIComponent(episodeId)}/sources`,
    fd,
    options,
  )
}

export async function adminRemoveEpisodeSource(animeId, episodeId, quality) {
  return adminJson(
    `/api/admin/anime/${encodeURIComponent(animeId)}/episodes/${encodeURIComponent(episodeId)}/sources/${encodeURIComponent(quality)}`,
    { method: 'DELETE' },
  )
}

export async function adminUpdateEpisode(animeId, episodeId, payload) {
  return adminJson(
    `/api/admin/anime/${encodeURIComponent(animeId)}/episodes/${encodeURIComponent(episodeId)}`,
    { method: 'PUT', body: JSON.stringify(payload) },
  )
}

export async function adminReplaceEpisodeVideo(animeId, episodeId, videoFile) {
  const fd = new FormData()
  fd.append('video', videoFile)
  return adminForm(
    `/api/admin/anime/${encodeURIComponent(animeId)}/episodes/${encodeURIComponent(episodeId)}/video`,
    fd,
  )
}

export async function adminSyncDurations(animeId) {
  return adminJson(`/api/admin/anime/${encodeURIComponent(animeId)}/sync-durations`, {
    method: 'POST',
  })
}

export async function adminDeleteEpisode(animeId, episodeId) {
  return adminJson(
    `/api/admin/anime/${encodeURIComponent(animeId)}/episodes/${encodeURIComponent(episodeId)}`,
    { method: 'DELETE' },
  )
}

export async function adminFetchHomeBanners() {
  return adminJson('/api/admin/home-banners', { cache: 'no-store' })
}

export async function adminCreateHomeBanner(payload) {
  return adminJson('/api/admin/home-banners', { method: 'POST', body: JSON.stringify(payload) })
}

export async function adminUpdateHomeBanner(id, payload) {
  return adminJson(`/api/admin/home-banners/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function adminDeleteHomeBanner(id) {
  return adminJson(`/api/admin/home-banners/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function adminBulkDeleteHomeBanners(ids) {
  return adminJson('/api/admin/home-banners/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  })
}

export async function adminReorderHomeBanners(ids) {
  return adminJson('/api/admin/home-banners/reorder', {
    method: 'PUT',
    body: JSON.stringify({ ids }),
  })
}

export async function adminUploadBannerImage(slideId, file) {
  const fd = new FormData()
  fd.append('banner', file)
  return adminForm(`/api/admin/home-banners/${encodeURIComponent(slideId)}/image`, fd)
}

export async function adminFetchAuthPage() {
  return adminJson('/api/admin/auth-page')
}

export async function adminUpdateAuthPage(payload) {
  return adminJson('/api/admin/auth-page', { method: 'PUT', body: JSON.stringify(payload) })
}

export async function adminUploadAuthPageImage(file) {
  const fd = new FormData()
  fd.append('image', file)
  return adminForm('/api/admin/auth-page/image', fd)
}

export async function adminFetchUsers() {
  return adminJson('/api/admin/users')
}

export async function adminFetchUser(id) {
  return adminJson(`/api/admin/users/${encodeURIComponent(id)}`)
}

export async function adminUpdateUser(id, payload) {
  return adminJson(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function adminDeleteUser(id) {
  return adminJson(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function adminBulkDeleteUsers(ids) {
  return adminJson('/api/admin/users/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  })
}

export async function adminUploadUserAvatar(userId, file) {
  const fd = new FormData()
  fd.append('avatar', file)
  return adminForm(`/api/admin/users/${encodeURIComponent(userId)}/avatar`, fd)
}
