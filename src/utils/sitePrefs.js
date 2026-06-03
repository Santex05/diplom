const PREFS_KEY = 'anicatalog_site_prefs'

export const DEFAULT_SITE_PREFS = {
  headerSearch: true,
  headerSettings: true,
  headerFavorites: true,
  headerCollection: true,
  headerRandom: false,
  autoPlayNext: true,
  autoFullscreen: true,
  skipOpening: false,
  skipEnding: false,
}

export function migratePrefs(parsed) {
  let next = { ...parsed }

  if (!next._v || next._v < 2) {
    next = {
      ...DEFAULT_SITE_PREFS,
      ...next,
      headerSearch: true,
      headerSettings: true,
      headerFavorites: next.headerFavorites ?? true,
      headerCollection: next.headerCollection ?? true,
      _v: 2,
    }
  }

  const { theme: _t, accent: _a, customAccents: _c, ...rest } = next
  return { ...DEFAULT_SITE_PREFS, ...rest, _v: 2 }
}

export function loadSitePrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...DEFAULT_SITE_PREFS }
    const parsed = JSON.parse(raw)
    return migratePrefs(parsed)
  } catch {
    return { ...DEFAULT_SITE_PREFS }
  }
}

export function saveSitePrefsLocal(prefs) {
  const next = migratePrefs({ ...loadSitePrefs(), ...prefs })
  localStorage.setItem(PREFS_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event('anicatalog-prefs'))
  return next
}

export function saveSitePrefs(prefs) {
  return saveSitePrefsLocal(prefs)
}
