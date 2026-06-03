import { fetchUserSettingsApi, updateUserSettingsApi } from '../api/userApi'
import { defaultCatalogState, loadCatalogState, saveCatalogStateLocal } from './catalogPrefs'
import {
  clearWatchHistory,
  loadFavorites,
  loadWatchState,
  saveWatchState,
} from './playerStorage'
import { getUserToken } from './userAuth'
import { loadPlaybackQueue } from './playbackQueue'
import { DEFAULT_SITE_PREFS, loadSitePrefs, saveSitePrefsLocal } from './sitePrefs'

const GUEST_DATA_KEY = 'anicatalog_guest_data'
const LEGACY_GUEST_SETTINGS_KEY = 'anicatalog_guest_settings'
const LEGACY_GUEST_SNAPSHOT_KEY = 'anicatalog_guest_settings_snapshot'
const ACTIVE_USER_KEY = 'anicatalog_active_user_id'
const SETTINGS_SCOPE_KEY = 'anicatalog_settings_scope'
const PLAYER_SETTINGS_KEY = 'anicatalog_player_settings'
const FAVORITES_KEY = 'anicatalog_favorites'
const QUEUE_KEY = 'anicatalog_playback_queue'

const DEFAULT_PLAYER_SETTINGS = { volume: 1, playbackSpeed: 1, lastQuality: 'auto' }

let syncTimer = null
let scopeSwitching = false

function readPlayerSettings() {
  try {
    const raw = localStorage.getItem(PLAYER_SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_PLAYER_SETTINGS }
    return { ...DEFAULT_PLAYER_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_PLAYER_SETTINGS }
  }
}

function writePlayerSettings(settings) {
  localStorage.setItem(PLAYER_SETTINGS_KEY, JSON.stringify({ ...DEFAULT_PLAYER_SETTINGS, ...settings }))
  window.dispatchEvent(new Event('anicatalog-player-settings'))
}

export function getSettingsStorageMode() {
  return getUserToken() ? 'account' : 'guest'
}

export function isAccountSettingsActive() {
  return getSettingsStorageMode() === 'account'
}

export function collectCurrentSettings() {
  return {
    sitePrefs: loadSitePrefs(),
    playerSettings: readPlayerSettings(),
    catalog: loadCatalogState(),
    playbackQueue: loadPlaybackQueue(),
  }
}

/** Настройки по умолчанию для нового аккаунта (не из гостевого режима). */
export function defaultAccountSettings() {
  return {
    sitePrefs: { ...DEFAULT_SITE_PREFS },
    playerSettings: { ...DEFAULT_PLAYER_SETTINGS },
    catalog: defaultCatalogState(),
    playbackQueue: [],
  }
}

function migrateLegacyGuestData() {
  if (localStorage.getItem(GUEST_DATA_KEY)) return

  const legacySettings =
    localStorage.getItem(LEGACY_GUEST_SETTINGS_KEY) ||
    localStorage.getItem(LEGACY_GUEST_SNAPSHOT_KEY)

  if (legacySettings) {
    try {
      const settings = JSON.parse(legacySettings)
      localStorage.setItem(
        GUEST_DATA_KEY,
        JSON.stringify({
          watchHistory: loadWatchState(),
          favorites: loadFavorites(),
          settings,
          _v: 1,
        }),
      )
    } catch {
      /* ignore */
    }
    localStorage.removeItem(LEGACY_GUEST_SETTINGS_KEY)
    localStorage.removeItem(LEGACY_GUEST_SNAPSHOT_KEY)
  }
}

export function loadGuestData() {
  migrateLegacyGuestData()
  try {
    const raw = localStorage.getItem(GUEST_DATA_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** @deprecated */
export function loadGuestSettings() {
  return loadGuestData()?.settings || null
}

export function collectGuestData() {
  return {
    watchHistory: loadWatchState(),
    favorites: loadFavorites(),
    settings: collectCurrentSettings(),
    _v: 1,
  }
}

export function persistGuestData() {
  try {
    localStorage.setItem(GUEST_DATA_KEY, JSON.stringify(collectGuestData()))
  } catch {
    /* ignore quota */
  }
}

/** @deprecated */
export function persistGuestSettings() {
  persistGuestData()
}

function clearActiveUserData() {
  scopeSwitching = true
  try {
    clearWatchHistory()
    localStorage.setItem(FAVORITES_KEY, '[]')
    localStorage.setItem(QUEUE_KEY, '[]')
    const defaults = defaultAccountSettings()
    saveSitePrefsLocal(defaults.sitePrefs)
    writePlayerSettings(defaults.playerSettings)
    saveCatalogStateLocal(defaults.catalog)
  } finally {
    scopeSwitching = false
  }
  window.dispatchEvent(new Event('anicatalog-history'))
  window.dispatchEvent(new Event('anicatalog-favorites'))
  window.dispatchEvent(new Event('anicatalog-queue'))
}

function restoreGuestData() {
  const guest = loadGuestData()
  if (!guest) return false

  scopeSwitching = true
  try {
    if (guest.watchHistory && typeof guest.watchHistory === 'object') {
      saveWatchState(guest.watchHistory)
    } else {
      clearWatchHistory()
    }

    localStorage.setItem(
      FAVORITES_KEY,
      JSON.stringify(Array.isArray(guest.favorites) ? guest.favorites : []),
    )

    if (guest.settings) {
      applyToActiveLayer(guest.settings, { silent: true })
    } else {
      applyToActiveLayer(defaultAccountSettings(), { silent: true })
    }
  } finally {
    scopeSwitching = false
  }

  window.dispatchEvent(new Event('anicatalog-history'))
  window.dispatchEvent(new Event('anicatalog-favorites'))
  window.dispatchEvent(new Event('anicatalog-queue'))
  return true
}

function applyToActiveLayer(remote, { silent = false } = {}) {
  if (!remote) return

  if (remote.sitePrefs && typeof remote.sitePrefs === 'object') {
    saveSitePrefsLocal(remote.sitePrefs)
  }

  if (remote.playerSettings && typeof remote.playerSettings === 'object') {
    writePlayerSettings(remote.playerSettings)
  }

  if (remote.catalog && typeof remote.catalog === 'object') {
    saveCatalogStateLocal(remote.catalog)
  } else if (remote.catalogUi && typeof remote.catalogUi === 'object') {
    saveCatalogStateLocal({
      filterPanelOpen: Boolean(remote.catalogUi.filterPanelOpen),
      view: remote.catalogUi.view === 'grid' ? 'grid' : 'list',
      filters: remote.catalogFilters || undefined,
    })
  }

  if (Array.isArray(remote.playbackQueue)) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remote.playbackQueue))
    if (!silent) window.dispatchEvent(new Event('anicatalog-queue'))
  }
}

export async function flushSettingsSync() {
  if (syncTimer) {
    clearTimeout(syncTimer)
    syncTimer = null
  }
  if (!getUserToken()) return
  try {
    await updateUserSettingsApi(collectCurrentSettings())
  } catch {
    /* offline */
  }
}

export function applyUserSettings(remote, { skipServer = false } = {}) {
  applyToActiveLayer(remote)
  if (!skipServer && isAccountSettingsActive()) {
    scheduleSettingsSync(0)
  }
}

export function saveCatalogUi(patch) {
  saveCatalogStateLocal(patch)
  onSettingsChanged()
}

export function saveCatalogFilters(filters) {
  saveCatalogStateLocal({ filters })
  onSettingsChanged()
}

function onSettingsChanged() {
  if (scopeSwitching) return
  if (isAccountSettingsActive()) {
    scheduleSettingsSync()
  } else {
    persistGuestData()
  }
  window.dispatchEvent(new Event('anicatalog-settings-scope'))
}

function onGuestUserDataChanged() {
  if (scopeSwitching || isAccountSettingsActive()) return
  persistGuestData()
}

export function scheduleSettingsSync(delayMs = 400) {
  if (!isAccountSettingsActive()) return
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(async () => {
    syncTimer = null
    try {
      await updateUserSettingsApi(collectCurrentSettings())
    } catch {
      /* offline */
    }
  }, delayMs)
}

export async function activateAccountSession(userId, { snapshotGuest = false } = {}) {
  if (!getUserToken()) return

  const prevUserId = sessionStorage.getItem(ACTIVE_USER_KEY)
  if (prevUserId && prevUserId !== String(userId)) {
    await flushSettingsSync()
  }

  const shouldSnapshotGuest =
    snapshotGuest ||
    (!prevUserId && sessionStorage.getItem(SETTINGS_SCOPE_KEY) === 'guest')

  if (shouldSnapshotGuest) {
    persistGuestData()
  }

  clearActiveUserData()

  sessionStorage.setItem(ACTIVE_USER_KEY, String(userId))
  sessionStorage.setItem(SETTINGS_SCOPE_KEY, 'account')

  let remote = null
  try {
    remote = await fetchUserSettingsApi()
  } catch {
    remote = null
  }

  scopeSwitching = true
  try {
    if (remote) {
      applyToActiveLayer(remote, { silent: true })
    } else {
      const defaults = defaultAccountSettings()
      try {
        await updateUserSettingsApi(defaults)
      } catch {
        /* ignore */
      }
      applyToActiveLayer(defaults, { silent: true })
    }
  } finally {
    scopeSwitching = false
  }

  window.dispatchEvent(new Event('anicatalog-queue'))
  window.dispatchEvent(new Event('anicatalog-settings-scope'))
}

export function activateGuestSession({ fromAccount = false } = {}) {
  if (syncTimer) {
    clearTimeout(syncTimer)
    syncTimer = null
  }

  sessionStorage.removeItem(ACTIVE_USER_KEY)
  sessionStorage.setItem(SETTINGS_SCOPE_KEY, 'guest')

  if (fromAccount) {
    clearActiveUserData()
    restoreGuestData()
  }

  window.dispatchEvent(new Event('anicatalog-settings-scope'))
}

/** @deprecated use activateAccountSession */
export async function syncUserSettingsOnAuth() {
  const token = getUserToken()
  if (!token) {
    activateGuestSession()
    return
  }
  await activateAccountSession('session')
}

/** @deprecated use activateGuestSession */
export function clearUserSettingsSync() {
  activateGuestSession()
}

export { defaultCatalogState }

if (typeof window !== 'undefined') {
  window.addEventListener('anicatalog-prefs', () => onSettingsChanged())
  window.addEventListener('anicatalog-player-settings', () => onSettingsChanged())
  window.addEventListener('anicatalog-catalog-state', () => onSettingsChanged())
  window.addEventListener('anicatalog-queue', () => onSettingsChanged())
  window.addEventListener('anicatalog-history', () => onGuestUserDataChanged())
  window.addEventListener('anicatalog-favorites', () => onGuestUserDataChanged())
}
