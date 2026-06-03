import { getUserToken } from './userAuth'
import { isEpisodeCompleted } from './episodeProgress'

const WATCH_KEY = 'anicatalog_watch_history'
const PLAYER_SETTINGS_KEY = 'anicatalog_player_settings'
const FAVORITES_KEY = 'anicatalog_favorites'

const DEFAULT_PLAYER_SETTINGS = { volume: 1, playbackSpeed: 1, lastQuality: 'auto' }

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function defaultWatchState() {
  return {
    userId: 'local-user',
    updatedAt: new Date().toISOString(),
    anime: [],
  }
}

function loadPlayerSettingsRaw() {
  const saved = readJson(PLAYER_SETTINGS_KEY, null)
  if (saved && typeof saved === 'object') return { ...DEFAULT_PLAYER_SETTINGS, ...saved }
  const legacy = readJson(WATCH_KEY, null)?.playerSettings
  if (legacy) {
    const merged = { ...DEFAULT_PLAYER_SETTINGS, ...legacy }
    writeJson(PLAYER_SETTINGS_KEY, merged)
    return merged
  }
  return { ...DEFAULT_PLAYER_SETTINGS }
}

function savePlayerSettingsRaw(patch) {
  writeJson(PLAYER_SETTINGS_KEY, { ...loadPlayerSettingsRaw(), ...patch })
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('anicatalog-player-settings'))
  }
}

export function loadWatchState() {
  return readJson(WATCH_KEY, defaultWatchState())
}

export function saveWatchState(state) {
  writeJson(WATCH_KEY, {
    ...state,
    updatedAt: new Date().toISOString(),
  })
}

export function loadVolume() {
  const v = loadPlayerSettingsRaw().volume
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1
}

export function saveVolume(volume) {
  savePlayerSettingsRaw({ volume: Math.min(1, Math.max(0, volume)) })
}

export function loadPlaybackSpeed() {
  const rate = loadPlayerSettingsRaw().playbackSpeed
  return Number.isFinite(rate) && rate > 0 ? rate : 1
}

export function savePlaybackSpeed(rate) {
  savePlayerSettingsRaw({ playbackSpeed: rate })
}

export function loadProgress(animeId, episodeId) {
  const aid = String(animeId)
  const eid = String(episodeId)
  const state = loadWatchState()
  const group = state.anime?.find((a) => String(a.animeId) === aid)
  const ep = group?.episodes?.find((e) => String(e.episodeId) === eid)
  if (!ep) return null
  return {
    currentTime: ep.lastPositionSeconds ?? 0,
    duration: ep.durationSeconds ?? 0,
    completed: Boolean(ep.completed),
    lastWatchedAt: ep.lastWatchedAt,
  }
}

export function markEpisodeWatched(animeId, episodeId, watched, meta = {}) {
  const prev = loadProgress(animeId, episodeId)
  const dur = meta.duration ?? prev?.duration ?? 0
  saveProgress(animeId, episodeId, {
    animeTitle: meta.animeTitle,
    episodeTitle: meta.episodeTitle,
    number: meta.number,
    cover: meta.cover,
    duration: dur,
    currentTime: watched ? Math.max(dur * 0.96, prev?.currentTime ?? 0, 1) : 0,
    completed: watched,
  })
}

export function markAllEpisodesWatched(animeId, episodes, watched, meta = {}) {
  for (const ep of episodes) {
    markEpisodeWatched(animeId, ep.id, watched, {
      ...meta,
      episodeTitle: ep.title,
      number: ep.number,
      duration: ep.durationSeconds,
    })
  }
}

export function saveProgress(animeId, episodeId, data) {
  const aid = String(animeId)
  const eid = String(episodeId)
  const state = loadWatchState()
  let group = state.anime?.find((a) => String(a.animeId) === aid)

  if (!group) {
    group = {
      animeId: aid,
      title: data.animeTitle || '',
      poster: data.cover || null,
      lastWatchedAt: null,
      episodes: [],
    }
    state.anime = state.anime || []
    state.anime.unshift(group)
  }

  const dur = data.duration ?? 0
  const time = data.currentTime ?? 0
  const progress = dur > 0 ? time / dur : 0

  let epEntry = group.episodes.find((e) => String(e.episodeId) === eid)
  if (!epEntry) {
    epEntry = { episodeId: eid, number: data.number ?? 0, title: data.episodeTitle || '' }
    group.episodes.push(epEntry)
  }

  epEntry.lastPositionSeconds = time
  epEntry.durationSeconds = dur
  epEntry.progress = progress
  epEntry.completed =
    Boolean(data.completed) || isEpisodeCompleted(time, dur)
  epEntry.lastWatchedAt = new Date().toISOString()
  epEntry.title = data.episodeTitle || epEntry.title

  group.title = data.animeTitle || group.title
  group.poster = data.cover ?? group.poster
  group.lastWatchedAt = epEntry.lastWatchedAt

  saveWatchState(state)

  if (getUserToken()) {
    import('../api/userApi')
      .then(({ saveProgressApi }) =>
        saveProgressApi({
          animeId: aid,
          episodeId: eid,
          animeTitle: data.animeTitle,
          cover: data.cover,
          episodeTitle: data.episodeTitle,
          number: data.number,
          currentTime: time,
          duration: dur,
          completed: epEntry.completed,
        }),
      )
      .catch(() => {})
  }
}

export function loadFavorites() {
  return readJson(FAVORITES_KEY, [])
}

export function isFavorite(animeId) {
  return loadFavorites().includes(animeId)
}

export function toggleFavorite(animeId) {
  const list = loadFavorites()
  const next = list.includes(animeId)
    ? list.filter((id) => id !== animeId)
    : [...list, animeId]
  writeJson(FAVORITES_KEY, next)
  window.dispatchEvent(new Event('anicatalog-favorites'))
  return next.includes(animeId)
}

/** Очистка истории и прогресса; настройки плеера (громкость, скорость) не трогаем */
export function clearWatchHistory() {
  saveWatchState(defaultWatchState())
  window.dispatchEvent(new Event('anicatalog-history'))
}

/** Синхронизация серверной коллекции в localStorage для превью и прогресса */
export function syncCollectionToLocal(items = []) {
  if (!items.length) return
  const state = loadWatchState()

  for (const item of items) {
    const aid = String(item.animeId)
    let group = state.anime?.find((a) => String(a.animeId) === aid)
    if (!group) {
      group = {
        animeId: aid,
        title: item.animeTitle || '',
        poster: item.cover || null,
        lastWatchedAt: item.updatedAt || null,
        episodes: [],
      }
      state.anime = state.anime || []
      state.anime.unshift(group)
    }

    group.title = item.animeTitle || group.title
    group.poster = item.cover ?? group.poster
    group.lastWatchedAt = item.updatedAt || group.lastWatchedAt

    for (const ep of item.episodes || []) {
      const eid = String(ep.episodeId)
      let epEntry = group.episodes.find((e) => String(e.episodeId) === eid)
      if (!epEntry) {
        epEntry = { episodeId: eid, number: ep.number ?? 0, title: ep.title || '' }
        group.episodes.push(epEntry)
      }
      const serverTime = new Date(ep.lastWatchedAt || 0).getTime()
      const localTime = new Date(epEntry.lastWatchedAt || 0).getTime()
      if (serverTime >= localTime) {
        epEntry.lastPositionSeconds = ep.lastPositionSeconds ?? 0
        epEntry.durationSeconds = ep.durationSeconds ?? 0
        epEntry.completed = Boolean(ep.completed)
        epEntry.lastWatchedAt = ep.lastWatchedAt
        epEntry.progress =
          epEntry.durationSeconds > 0
            ? epEntry.lastPositionSeconds / epEntry.durationSeconds
            : 0
      }
    }
  }

  saveWatchState(state)
  window.dispatchEvent(new Event('anicatalog-history'))
}

export function removeAnimeFromLocalHistory(animeId) {
  const aid = String(animeId)
  const state = loadWatchState()
  state.anime = (state.anime || []).filter((a) => String(a.animeId) !== aid)
  saveWatchState(state)
  window.dispatchEvent(new Event('anicatalog-history'))
}

export function removeHistoryEpisode(animeId, episodeId) {
  const aid = String(animeId)
  const eid = String(episodeId)
  const state = loadWatchState()
  const group = state.anime?.find((a) => String(a.animeId) === aid)
  if (!group) return

  group.episodes = (group.episodes || []).filter((e) => String(e.episodeId) !== eid)
  if (group.episodes.length === 0) {
    state.anime = (state.anime || []).filter((a) => String(a.animeId) !== aid)
  }
  saveWatchState(state)
  window.dispatchEvent(new Event('anicatalog-history'))
}

/** Плоский список просмотров для UI истории */
export function flattenHistoryForUI(animeList = []) {
  const groups = groupHistoryForUI(animeList)
  const items = []

  for (const group of groups) {
    for (const ep of group.episodes) {
      items.push({
        animeId: group.animeId,
        animeTitle: group.animeTitle,
        cover: group.cover,
        episodeId: ep.episodeId,
        number: ep.number,
        title: ep.title,
        completed: Boolean(ep.completed),
        lastPositionSeconds: ep.lastPositionSeconds ?? 0,
        durationSeconds: ep.durationSeconds ?? 0,
        lastWatchedAt: ep.lastWatchedAt,
      })
    }
  }

  return items.sort(
    (a, b) => new Date(b.lastWatchedAt || 0) - new Date(a.lastWatchedAt || 0),
  )
}

const PERIOD_LABELS = {
  today: 'Сегодня',
  yesterday: 'Вчера',
  lastWeek: 'На прошлой неделе',
  older: 'Ранее',
}

function historyPeriodBucket(iso, startOfToday, startOfYesterday, startOfWeek) {
  const d = new Date(iso || 0)
  if (d >= startOfToday) return 'today'
  if (d >= startOfYesterday) return 'yesterday'
  if (d >= startOfWeek) return 'lastWeek'
  return 'older'
}

/** История по аниме, разбитая по периодам (одна карточка = одно аниме) */
export function groupAnimeHistoryByPeriod(animeList = []) {
  const groups = groupHistoryForUI(animeList)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfWeek.getDate() - 7)

  const buckets = { today: [], yesterday: [], lastWeek: [], older: [] }

  for (const group of groups) {
    const key = historyPeriodBucket(
      group.lastWatchedAt,
      startOfToday,
      startOfYesterday,
      startOfWeek,
    )
    buckets[key].push(group)
  }

  return ['today', 'yesterday', 'lastWeek', 'older']
    .filter((key) => buckets[key].length > 0)
    .map((key) => ({
      id: key,
      label: PERIOD_LABELS[key],
      items: buckets[key],
    }))
}

/** Плоский список — по эпизодам (legacy) */
export function groupHistoryByPeriod(items) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfWeek.getDate() - 7)

  const buckets = { today: [], yesterday: [], lastWeek: [], older: [] }

  for (const item of items) {
    const d = new Date(item.lastWatchedAt || 0)
    if (d >= startOfToday) buckets.today.push(item)
    else if (d >= startOfYesterday) buckets.yesterday.push(item)
    else if (d >= startOfWeek) buckets.lastWeek.push(item)
    else buckets.older.push(item)
  }

  return ['today', 'yesterday', 'lastWeek', 'older']
    .filter((key) => buckets[key].length > 0)
    .map((key) => ({
      id: key,
      label: PERIOD_LABELS[key],
      items: buckets[key],
    }))
}

export function formatHistoryTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function groupHistoryForUI(animeList = []) {
  const state = loadWatchState()
  const groups = (state.anime || [])
    .map((group) => {
      const meta = animeList.find(
        (a) =>
          a.id === group.animeId ||
          decodeURIComponent(a.id) === decodeURIComponent(group.animeId),
      )
      return {
        animeId: group.animeId,
        animeTitle: group.title || meta?.title || 'Без названия',
        cover: meta?.cover || group.poster || null,
        lastWatchedAt: group.lastWatchedAt,
        episodes: [...(group.episodes || [])].sort(
          (a, b) =>
            new Date(b.lastWatchedAt || 0) - new Date(a.lastWatchedAt || 0),
        ),
      }
    })
    .filter((g) => g.episodes.length > 0)
    .sort(
      (a, b) =>
        new Date(b.lastWatchedAt || 0) - new Date(a.lastWatchedAt || 0),
    )

  return groups
}

export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

export function progressPercent(current, duration) {
  if (!duration || duration <= 0) return 0
  return Math.min(100, Math.round((current / duration) * 100))
}

function isResumableProgress(prog) {
  if (!prog || prog.completed) return false
  return (prog.lastPositionSeconds ?? 0) >= 1
}

export function getContinueEpisode(animeId, episodes = []) {
  const aid = String(animeId)
  const state = loadWatchState()
  const group = state.anime?.find((a) => String(a.animeId) === aid)
  const sorted = [...episodes].sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
  if (!sorted.length || !group?.episodes?.length) return null

  let best = null
  let bestTs = -1
  for (const prog of group.episodes) {
    if (!isResumableProgress(prog)) continue
    const meta = sorted.find((e) => String(e.id) === String(prog.episodeId))
    if (!meta) continue
    const ts = prog.lastWatchedAt
      ? new Date(prog.lastWatchedAt).getTime()
      : prog.lastPositionSeconds ?? 0
    if (ts >= bestTs) {
      bestTs = ts
      best = { episode: meta, progress: prog }
    }
  }
  return best
}

/** Первый непросмотренный эпизод (или 1-й, если все отмечены) — для «Смотреть с N эпизода». */
export function getNextEpisodeToWatch(animeId, episodes = []) {
  const sorted = [...episodes].sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
  if (!sorted.length) return null

  const aid = String(animeId)
  const group = loadWatchState().anime?.find((a) => String(a.animeId) === aid)

  for (const ep of sorted) {
    const prog = group?.episodes?.find((p) => String(p.episodeId) === String(ep.id))
    if (!prog?.completed) {
      return { episode: ep, progress: prog ?? null }
    }
  }

  return { episode: sorted[0], progress: null }
}

export function countWatchedEpisodes(animeId, episodes = []) {
  const aid = String(animeId)
  const state = loadWatchState()
  const group = state.anime?.find((a) => String(a.animeId) === aid)
  if (!group?.episodes?.length) return 0
  return episodes.filter((ep) => {
    const p = group.episodes.find((x) => String(x.episodeId) === String(ep.id))
    return p?.completed
  }).length
}
