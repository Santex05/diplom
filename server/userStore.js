import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { assertLogin, assertNickname, assertPassword } from '../authLimits.js'
import { isPgEnabled } from './db/pool.js'
import * as usersPg from './db/usersPersistence.js'

const MS_DAY = 86400000

function isEpisodeCompleted(currentTime, duration) {
  const dur = Number(duration)
  const time = Number(currentTime)
  if (!dur || dur <= 0 || !Number.isFinite(time) || time < 60) return false
  const remaining = dur - time
  return remaining <= 120 || time / dur >= 0.88
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password, stored) {
  if (!stored?.includes(':')) return false
  const [salt, hash] = stored.split(':')
  const hash2 = crypto.scryptSync(String(password), salt, 64).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hash2))
}

const DEFAULT_SITE_PREFS = {
  headerSearch: true,
  headerSettings: true,
  headerFavorites: true,
  headerCollection: true,
  headerRandom: false,
  autoPlayNext: true,
  autoFullscreen: true,
  skipOpening: false,
  skipEnding: false,
  _v: 2,
}

const DEFAULT_PLAYER_SETTINGS = { volume: 1, playbackSpeed: 1, lastQuality: 'auto' }

function defaultCatalogFilters() {
  return {
    search: '',
    genres: [],
    types: [],
    releaseStatus: [],
    seasons: [],
    sort: 'updated_desc',
    yearMin: 1995,
    yearMax: new Date().getFullYear() + 1,
    ageRatings: [],
    category: 'all',
  }
}

function defaultCatalogState() {
  const filters = defaultCatalogFilters()
  return {
    draftFilters: { ...filters },
    appliedFilters: { ...filters },
    view: 'list',
    filterPanelOpen: false,
  }
}

function defaultUserSettings() {
  return {
    sitePrefs: { ...DEFAULT_SITE_PREFS },
    playerSettings: { ...DEFAULT_PLAYER_SETTINGS },
    catalog: defaultCatalogState(),
    playbackQueue: [],
    _v: 2,
  }
}

function migrateCatalogRecord(catalog) {
  if (!catalog || typeof catalog !== 'object') return defaultCatalogState()
  if (catalog.draftFilters && catalog.appliedFilters) {
    return {
      draftFilters: { ...defaultCatalogFilters(), ...catalog.draftFilters },
      appliedFilters: { ...defaultCatalogFilters(), ...catalog.appliedFilters },
      view: catalog.view === 'grid' ? 'grid' : 'list',
      filterPanelOpen: Boolean(catalog.filterPanelOpen),
    }
  }
  const legacy = catalog.filters
  const def = defaultCatalogState()
  if (legacy && typeof legacy === 'object') {
    const merged = { ...defaultCatalogFilters(), ...legacy }
    return {
      draftFilters: catalog.draftFilters ? { ...def.draftFilters, ...catalog.draftFilters } : { ...merged },
      appliedFilters: { ...merged },
      view: catalog.view === 'grid' ? 'grid' : 'list',
      filterPanelOpen: Boolean(catalog.filterPanelOpen),
    }
  }
  return def
}

function mergeCatalogSettings(baseCatalog, incoming = {}) {
  const base = migrateCatalogRecord(baseCatalog)
  const inc = incoming || {}
  const legacy = inc.filters || null

  let draftFilters = { ...base.draftFilters, ...(inc.draftFilters || {}) }
  let appliedFilters = { ...base.appliedFilters, ...(inc.appliedFilters || {}) }

  if (legacy && typeof legacy === 'object') {
    if (inc.draftFilters || inc.appliedFilters) {
      if (inc.appliedFilters) appliedFilters = { ...appliedFilters, ...legacy }
    } else {
      appliedFilters = { ...appliedFilters, ...legacy }
    }
  }

  return {
    draftFilters,
    appliedFilters,
    view: inc.view === 'grid' ? 'grid' : inc.view === 'list' ? 'list' : base.view,
    filterPanelOpen: inc.filterPanelOpen ?? base.filterPanelOpen,
  }
}

function defaultDb() {
  return { users: [], sessions: {}, favorites: {}, collection: {}, ratings: {}, settings: {} }
}

export function createUserStore({ dataFile, avatarsDir }) {
  let db = defaultDb()

  function ensureDisplayIds() {
    let max = db.users.reduce((m, u) => Math.max(m, Number(u.displayId) || 0), 0)
    let changed = false
    for (const user of db.users) {
      if (!user.displayId) {
        max += 1
        user.displayId = max
        changed = true
      }
    }
    return changed
  }

  async function load() {
    if (isPgEnabled()) {
      db = await usersPg.loadUsersDb()
      if (ensureDisplayIds()) await save()
      return
    }
    try {
      const raw = await fs.readFile(dataFile, 'utf-8')
      db = { ...defaultDb(), ...JSON.parse(raw) }
      if (ensureDisplayIds()) await save()
    } catch {
      db = defaultDb()
      await save()
    }
  }

  async function save() {
    if (isPgEnabled()) return usersPg.saveUsersDb(db)
    await fs.mkdir(path.dirname(dataFile), { recursive: true })
    await fs.writeFile(dataFile, JSON.stringify(db, null, 2), 'utf-8')
  }

  function issueToken(userId) {
    const token = `usr_${Date.now()}_${crypto.randomBytes(18).toString('hex')}`
    db.sessions[token] = userId
    save().catch(console.error)
    return token
  }

  function revokeToken(token) {
    delete db.sessions[token]
    save().catch(console.error)
  }

  function userIdFromToken(token) {
    if (!token?.startsWith('usr_')) return null
    return db.sessions[token] || null
  }

  function publicUser(user) {
    if (!user) return null
    return {
      id: user.id,
      displayId: user.displayId ?? null,
      login: user.login,
      nickname: user.nickname,
      email: user.email,
      avatar: user.avatar || null,
      createdAt: user.createdAt,
    }
  }

  async function register({ login, nickname, email, password }) {
    const l = assertLogin(login)
    const nick = assertNickname(nickname)
    assertPassword(password)
    const e = String(email).trim().toLowerCase()
    if (!e.includes('@')) throw new Error('Некорректная почта')

    if (db.users.some((u) => u.login === l)) throw new Error('Логин уже занят')
    if (db.users.some((u) => u.email === e)) throw new Error('Почта уже используется')

    const displayId =
      db.users.reduce((m, u) => Math.max(m, Number(u.displayId) || 0), 0) + 1
    const user = {
      id: `u_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      displayId,
      login: l,
      nickname: nick,
      email: e,
      passwordHash: hashPassword(password),
      avatar: null,
      createdAt: new Date().toISOString(),
    }
    db.users.push(user)
    db.favorites[user.id] = []
    db.collection[user.id] = []
    await save()
    return user
  }

  async function login({ login, password }) {
    const key = assertLogin(login)
    const user = db.users.find((u) => u.login === key)
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new Error('Неверный логин или пароль')
    }
    touchLastSeen(user.id)
    return user
  }

  function touchLastSeen(userId) {
    const user = getUserById(userId)
    if (!user) return
    user.lastSeenAt = new Date().toISOString()
    save().catch(console.error)
  }

  function getUserById(id) {
    return db.users.find((u) => u.id === id) || null
  }

  async function updateProfile(userId, { nickname, login }) {
    const user = getUserById(userId)
    if (!user) throw new Error('Пользователь не найден')
    if (nickname != null) {
      user.nickname = assertNickname(nickname)
    }
    if (login != null) {
      const l = assertLogin(login)
      if (db.users.some((u) => u.id !== userId && u.login === l)) {
        throw new Error('Логин уже занят')
      }
      user.login = l
    }
    await save()
    return user
  }

  async function updatePassword(userId, { currentPassword, newPassword }) {
    const user = getUserById(userId)
    if (!user) throw new Error('Пользователь не найден')
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      throw new Error('Текущий пароль неверен')
    }
    assertPassword(newPassword, 'Новый пароль')
    user.passwordHash = hashPassword(newPassword)
    await save()
    return user
  }

  async function setAvatar(userId, avatarPath) {
    const user = getUserById(userId)
    if (!user) throw new Error('Пользователь не найден')
    user.avatar = avatarPath
    await save()
    return user
  }

  async function removeAvatar(userId) {
    const user = getUserById(userId)
    if (!user) throw new Error('Пользователь не найден')
    if (user.avatar) {
      const p = path.join(avatarsDir, path.basename(user.avatar))
      await fs.unlink(p).catch(() => {})
    }
    user.avatar = null
    await save()
    return user
  }

  async function deleteUser(userId, password) {
    const user = getUserById(userId)
    if (!user) throw new Error('Пользователь не найден')
    if (!verifyPassword(password, user.passwordHash)) {
      throw new Error('Неверный пароль')
    }
    db.users = db.users.filter((u) => u.id !== userId)
    delete db.favorites[userId]
    delete db.collection[userId]
    delete db.settings[userId]
    for (const [token, uid] of Object.entries(db.sessions)) {
      if (uid === userId) delete db.sessions[token]
    }
    await save()
    if (user.avatar) {
      const p = path.join(avatarsDir, path.basename(user.avatar))
      await fs.unlink(p).catch(() => {})
    }
  }

  function getFavorites(userId) {
    return [...(db.favorites[userId] || [])]
  }

  async function toggleFavorite(userId, animeId) {
    const list = db.favorites[userId] || (db.favorites[userId] = [])
    const id = String(animeId)
    const i = list.indexOf(id)
    if (i >= 0) list.splice(i, 1)
    else list.push(id)
    await save()
    return list.includes(id)
  }

  function getCollection(userId) {
    return db.collection[userId] || (db.collection[userId] = [])
  }

  function computeStatus(entry, animeMeta) {
    const eps = entry.episodes || []
    const now = Date.now()
    const lastMs = eps.reduce(
      (max, e) => Math.max(max, new Date(e.lastWatchedAt || 0).getTime()),
      0,
    )
    const daysSince = lastMs ? (now - lastMs) / MS_DAY : Infinity

    const total = animeMeta?.episodes?.length || 0
    const completedCount = eps.filter((e) => e.completed).length
    const allWatched = total > 0 && completedCount >= total

    if (allWatched) return 'watched'

    if (eps.length > 0) {
      if (daysSince > 90) return 'dropped'
      if (daysSince > 7) return 'on_hold'
      if (!entry.manualStatus && eps.some((e) => (e.lastPositionSeconds ?? 0) > 0 || e.completed)) {
        return 'watching'
      }
    }

    if (entry.manualStatus) return entry.manualStatus
    if (eps.length === 0) return 'planned'
    return 'watching'
  }

  function enrichCollectionEntry(entry, animeMeta) {
    const status = computeStatus(entry, animeMeta)
    return {
      animeId: entry.animeId,
      status,
      manualStatus: entry.manualStatus || null,
      updatedAt: entry.updatedAt || entry.episodes?.[0]?.lastWatchedAt,
      episodes: [...(entry.episodes || [])].sort(
        (a, b) => (a.number ?? 0) - (b.number ?? 0),
      ),
    }
  }

  async function saveProgress(userId, payload) {
    const {
      animeId,
      episodeId,
      animeTitle,
      cover,
      episodeTitle,
      number,
      currentTime,
      duration,
      completed,
    } = payload

    const list = getCollection(userId)
    let entry = list.find((e) => String(e.animeId) === String(animeId))
    if (!entry) {
      entry = {
        animeId: String(animeId),
        title: animeTitle || '',
        cover: cover || null,
        manualStatus: 'watching',
        updatedAt: new Date().toISOString(),
        episodes: [],
      }
      list.unshift(entry)
    }

    let ep = entry.episodes.find((e) => String(e.episodeId) === String(episodeId))
    if (!ep) {
      ep = { episodeId: String(episodeId), number: number ?? 0, title: episodeTitle || '' }
      entry.episodes.push(ep)
    }

    ep.lastPositionSeconds = currentTime ?? 0
    ep.durationSeconds = duration ?? 0
    ep.completed = Boolean(completed) || isEpisodeCompleted(currentTime, duration)
    ep.lastWatchedAt = new Date().toISOString()
    ep.title = episodeTitle || ep.title
    ep.number = number ?? ep.number

    entry.title = animeTitle || entry.title
    entry.cover = cover ?? entry.cover
    entry.updatedAt = ep.lastWatchedAt
    entry.manualStatus = null

    await save()
    return entry
  }

  async function setCollectionStatus(userId, animeId, manualStatus, meta = {}) {
    const list = getCollection(userId)
    let entry = list.find((e) => String(e.animeId) === String(animeId))
    if (!entry) {
      entry = {
        animeId: String(animeId),
        title: meta.title || '',
        cover: meta.cover || null,
        manualStatus,
        updatedAt: new Date().toISOString(),
        episodes: [],
      }
      list.unshift(entry)
    } else {
      entry.manualStatus = manualStatus
      if (meta.title) entry.title = meta.title
      if (meta.cover) entry.cover = meta.cover
      entry.updatedAt = new Date().toISOString()
    }
    await save()
    return entry
  }

  async function removeFromCollection(userId, animeId) {
    const list = getCollection(userId)
    const i = list.findIndex((e) => String(e.animeId) === String(animeId))
    if (i >= 0) list.splice(i, 1)
    const fav = db.favorites[userId]
    if (fav) {
      const fi = fav.indexOf(String(animeId))
      if (fi >= 0) fav.splice(fi, 1)
    }
    await save()
  }

  async function removeCollectionEpisode(userId, animeId, episodeId) {
    const list = getCollection(userId)
    const entry = list.find((e) => String(e.animeId) === String(animeId))
    if (!entry) return
    entry.episodes = entry.episodes.filter((e) => String(e.episodeId) !== String(episodeId))
    if (entry.episodes.length === 0) {
      const i = list.findIndex((e) => String(e.animeId) === String(animeId))
      if (i >= 0) list.splice(i, 1)
    }
    await save()
  }

  async function clearCollection(userId) {
    db.collection[userId] = []
    db.favorites[userId] = []
    await save()
  }

  function getAnimeRatingStats(animeId) {
    const map = db.ratings[String(animeId)] || {}
    const scores = Object.values(map).map(Number).filter((n) => n >= 1 && n <= 10)
    if (!scores.length) return { average: null, count: 0 }
    const sum = scores.reduce((a, b) => a + b, 0)
    return {
      average: Math.round((sum / scores.length) * 10) / 10,
      count: scores.length,
    }
  }

  function getUserRating(userId, animeId) {
    return db.ratings[String(animeId)]?.[userId] ?? null
  }

  async function setRating(userId, animeId, score) {
    const s = Math.min(10, Math.max(1, Math.round(Number(score))))
    if (!Number.isFinite(s)) throw new Error('Оценка от 1 до 10')
    const aid = String(animeId)
    if (!db.ratings[aid]) db.ratings[aid] = {}
    db.ratings[aid][userId] = s
    await save()
    return { score: s, ...getAnimeRatingStats(aid) }
  }

  function getSettings(userId) {
    const raw = db.settings[userId]
    if (!raw) return null
    return normalizeSettings(raw)
  }

  function normalizeSettings(patch = {}) {
    const cur = defaultUserSettings()
    const legacyCatalog = patch.catalogUi || {}
    const legacyFilters = patch.catalogFilters || {}
    const incomingCatalog = {
      ...(patch.catalog || {}),
      ...(Object.keys(legacyFilters).length ? { filters: legacyFilters } : {}),
      ...(legacyCatalog.view ? { view: legacyCatalog.view } : {}),
      ...(legacyCatalog.filterPanelOpen != null
        ? { filterPanelOpen: legacyCatalog.filterPanelOpen }
        : {}),
    }
    if (patch.catalogView === 'grid') incomingCatalog.view = 'grid'

    const catalog = mergeCatalogSettings(cur.catalog, incomingCatalog)

    const queue = Array.isArray(patch.playbackQueue) ? patch.playbackQueue : cur.playbackQueue

    return {
      ...cur,
      sitePrefs: { ...cur.sitePrefs, ...(patch.sitePrefs || {}) },
      playerSettings: { ...cur.playerSettings, ...(patch.playerSettings || {}) },
      catalog,
      playbackQueue: queue.filter((item) => item && item.animeId),
      updatedAt: patch.updatedAt || new Date().toISOString(),
      _v: 2,
    }
  }

  async function updateSettings(userId, patch) {
    const base = getSettings(userId) || defaultUserSettings()
    const next = normalizeSettings({ ...base, ...patch })
    db.settings[userId] = next
    await save()
    return next
  }

  function getUserRatings(userId) {
    const list = []
    for (const [animeId, byUser] of Object.entries(db.ratings || {})) {
      const score = byUser?.[userId]
      if (score != null) list.push({ animeId, score: Number(score) })
    }
    return list.sort((a, b) => b.score - a.score)
  }

  function getUserWatchStats(userId) {
    const collection = getCollection(userId)
    let episodesStarted = 0
    let episodesCompleted = 0
    const animeList = collection.map((entry) => {
      const eps = entry.episodes || []
      const started = eps.filter((e) => e.completed || (e.lastPositionSeconds ?? 0) > 60)
      episodesStarted += started.length
      episodesCompleted += eps.filter((e) => e.completed).length
      return {
        animeId: entry.animeId,
        title: entry.title || entry.animeId,
        status: entry.manualStatus || null,
        episodesTotal: eps.length,
        episodesStarted: started.length,
        episodesCompleted: eps.filter((e) => e.completed).length,
        lastWatchedAt: entry.updatedAt || null,
      }
    })
    return {
      animeInCollection: collection.length,
      episodesStarted,
      episodesCompleted,
      animeList,
    }
  }

  function isUserOnline(user) {
    if (!user?.lastSeenAt) return false
    const last = new Date(user.lastSeenAt).getTime()
    return Date.now() - last < 5 * 60 * 1000
  }

  function adminUserDetail(user) {
    if (!user) return null
    const watch = getUserWatchStats(user.id)
    const ratings = getUserRatings(user.id)
    return {
      ...publicUser(user),
      isOnline: isUserOnline(user),
      lastSeenAt: user.lastSeenAt || null,
      favoritesCount: (db.favorites[user.id] || []).length,
      favorites: [...(db.favorites[user.id] || [])],
      ratings,
      ratingsCount: ratings.length,
      watch,
      passwordNote: 'Пароль хранится в зашифрованном виде — просмотр невозможен, можно только задать новый',
    }
  }

  function listUsersForAdmin() {
    return db.users
      .map((u) => adminUserDetail(u))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  async function adminUpdateUser(userId, { login, nickname, email, password } = {}) {
    const user = getUserById(userId)
    if (!user) throw new Error('Пользователь не найден')

    if (login != null) {
      const l = assertLogin(login)
      if (db.users.some((u) => u.id !== userId && u.login === l)) {
        throw new Error('Логин уже занят')
      }
      user.login = l
    }
    if (nickname != null) {
      user.nickname = assertNickname(nickname)
    }
    if (email != null) {
      const e = String(email).trim().toLowerCase()
      if (!e.includes('@')) throw new Error('Некорректная почта')
      if (db.users.some((u) => u.id !== userId && u.email === e)) {
        throw new Error('Почта уже используется')
      }
      user.email = e
    }
    if (password != null && String(password).trim()) {
      assertPassword(password, 'Пароль')
      user.passwordHash = hashPassword(password)
    }

    await save()
    return user
  }

  async function adminDeleteUser(userId) {
    const user = getUserById(userId)
    if (!user) throw new Error('Пользователь не найден')

    for (const [animeId, byUser] of Object.entries(db.ratings || {})) {
      if (byUser[userId] != null) {
        delete byUser[userId]
        if (Object.keys(byUser).length === 0) delete db.ratings[animeId]
      }
    }

    db.users = db.users.filter((u) => u.id !== userId)
    delete db.favorites[userId]
    delete db.collection[userId]
    delete db.settings[userId]
    for (const [token, uid] of Object.entries(db.sessions)) {
      if (uid === userId) delete db.sessions[token]
    }
    await save()
    if (user.avatar) {
      const p = path.join(avatarsDir, path.basename(user.avatar))
      await fs.unlink(p).catch(() => {})
    }
    return true
  }

  async function adminSetAvatar(userId, avatarPath) {
    const user = getUserById(userId)
    if (!user) throw new Error('Пользователь не найден')
    if (user.avatar && user.avatar !== avatarPath) {
      const p = path.join(avatarsDir, path.basename(user.avatar))
      await fs.unlink(p).catch(() => {})
    }
    user.avatar = avatarPath
    await save()
    return user
  }

  async function mergeLocalData(userId, { favorites = [], watchGroups = [], settings = null }) {
    const fav = db.favorites[userId] || (db.favorites[userId] = [])
    for (const id of favorites) {
      if (!fav.includes(String(id))) fav.push(String(id))
    }
    if (settings && !getSettings(userId)) {
      await updateSettings(userId, settings)
    }
    for (const group of watchGroups) {
      for (const ep of group.episodes || []) {
        await saveProgress(userId, {
          animeId: group.animeId,
          episodeId: ep.episodeId,
          animeTitle: group.title,
          cover: group.poster,
          episodeTitle: ep.title,
          number: ep.number,
          currentTime: ep.lastPositionSeconds,
          duration: ep.durationSeconds,
          completed: ep.completed,
        })
      }
    }
  }

  return {
    load,
    issueToken,
    revokeToken,
    userIdFromToken,
    publicUser,
    register,
    login,
    getUserById,
    updateProfile,
    updatePassword,
    setAvatar,
    removeAvatar,
    deleteUser,
    getFavorites,
    toggleFavorite,
    getCollection,
    enrichCollectionEntry,
    computeStatus,
    saveProgress,
    setCollectionStatus,
    removeFromCollection,
    removeCollectionEpisode,
    clearCollection,
    mergeLocalData,
    getSettings,
    updateSettings,
    getAnimeRatingStats,
    getUserRating,
    setRating,
    avatarsDir,
    touchLastSeen,
    listUsersForAdmin,
    adminUserDetail,
    getUserRatings,
    getUserWatchStats,
    adminUpdateUser,
    adminDeleteUser,
    adminSetAvatar,
  }
}
