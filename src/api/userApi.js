import { getUserToken, setUserToken, clearUserToken } from '../utils/userAuth'

const API_BASE = import.meta.env.VITE_API_URL || ''

function userHeaders(json = true) {
  const headers = {}
  const token = getUserToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (json) headers['Content-Type'] = 'application/json'
  return headers
}

async function parseJson(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Ошибка запроса')
  return data
}

export async function registerUser(payload) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await parseJson(res)
  setUserToken(data.token)
  return data
}

export async function loginUser(login, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  })
  const data = await parseJson(res)
  setUserToken(data.token)
  return data
}

export async function logoutUser() {
  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: userHeaders(false),
    })
  } finally {
    clearUserToken()
  }
}

export async function fetchMe() {
  const res = await fetch(`${API_BASE}/api/auth/me`, { headers: userHeaders(false) })
  if (res.status === 401) return null
  const data = await parseJson(res)
  return data.user
}

export async function fetchFavorites() {
  const res = await fetch(`${API_BASE}/api/user/favorites`, { headers: userHeaders(false) })
  const data = await parseJson(res)
  return data.ids || []
}

export async function toggleFavoriteApi(animeId) {
  const res = await fetch(`${API_BASE}/api/user/favorites/${encodeURIComponent(animeId)}`, {
    method: 'POST',
    headers: userHeaders(false),
  })
  return parseJson(res)
}

export async function fetchCollection() {
  const res = await fetch(`${API_BASE}/api/user/collection`, { headers: userHeaders(false) })
  const data = await parseJson(res)
  return data.items || []
}

export async function saveProgressApi(payload) {
  await fetch(`${API_BASE}/api/user/progress`, {
    method: 'POST',
    headers: userHeaders(),
    body: JSON.stringify(payload),
  }).then(parseJson)
}

export async function fetchUserSettingsApi() {
  const res = await fetch(`${API_BASE}/api/user/settings`, { headers: userHeaders(false) })
  const data = await parseJson(res)
  return data.settings || null
}

export async function updateUserSettingsApi(settings) {
  const res = await fetch(`${API_BASE}/api/user/settings`, {
    method: 'PATCH',
    headers: userHeaders(),
    body: JSON.stringify(settings),
  })
  const data = await parseJson(res)
  return data.settings
}

export async function mergeLocalDataApi(payload) {
  await fetch(`${API_BASE}/api/user/merge-local`, {
    method: 'POST',
    headers: userHeaders(),
    body: JSON.stringify(payload),
  }).then(parseJson)
}

export async function updateProfileApi({ nickname, login } = {}) {
  const res = await fetch(`${API_BASE}/api/user/profile`, {
    method: 'PATCH',
    headers: userHeaders(),
    body: JSON.stringify({ nickname, login }),
  })
  return parseJson(res)
}

export async function updatePasswordApi(currentPassword, newPassword) {
  const res = await fetch(`${API_BASE}/api/user/password`, {
    method: 'PATCH',
    headers: userHeaders(),
    body: JSON.stringify({ currentPassword, newPassword, passwordConfirm: newPassword }),
  })
  return parseJson(res)
}

export async function deleteAccountApi(password) {
  const res = await fetch(`${API_BASE}/api/user/account`, {
    method: 'DELETE',
    headers: userHeaders(),
    body: JSON.stringify({ password }),
  })
  return parseJson(res)
}

export async function uploadAvatarApi(file) {
  const fd = new FormData()
  fd.append('avatar', file)
  const res = await fetch(`${API_BASE}/api/user/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getUserToken()}` },
    body: fd,
  })
  return parseJson(res)
}

export async function deleteAvatarApi() {
  const res = await fetch(`${API_BASE}/api/user/avatar`, {
    method: 'DELETE',
    headers: userHeaders(),
  })
  return parseJson(res)
}

export async function removeFromCollectionApi(animeId) {
  await fetch(`${API_BASE}/api/user/collection/${encodeURIComponent(animeId)}`, {
    method: 'DELETE',
    headers: userHeaders(false),
  }).then(parseJson)
}

export async function setCollectionStatusApi(animeId, status, meta = {}) {
  const res = await fetch(
    `${API_BASE}/api/user/collection/${encodeURIComponent(animeId)}/status`,
    {
      method: 'PATCH',
      headers: userHeaders(),
      body: JSON.stringify({ status, ...meta }),
    },
  )
  return parseJson(res)
}

export async function clearCollectionApi() {
  await fetch(`${API_BASE}/api/user/collection`, {
    method: 'DELETE',
    headers: userHeaders(false),
  }).then(parseJson)
}

export async function removeCollectionEpisodeApi(animeId, episodeId) {
  await fetch(
    `${API_BASE}/api/user/collection/${encodeURIComponent(animeId)}/episodes/${encodeURIComponent(episodeId)}`,
    { method: 'DELETE', headers: userHeaders(false) },
  ).then(parseJson)
}

export async function fetchAnimeRating(animeId) {
  const res = await fetch(`${API_BASE}/api/anime/${encodeURIComponent(animeId)}/rating`, {
    headers: userHeaders(false),
  })
  return parseJson(res)
}

export async function setAnimeRatingApi(animeId, score) {
  const res = await fetch(`${API_BASE}/api/user/ratings/${encodeURIComponent(animeId)}`, {
    method: 'POST',
    headers: userHeaders(),
    body: JSON.stringify({ score }),
  })
  return parseJson(res)
}
