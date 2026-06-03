import { DEFAULT_CATALOG_FILTERS } from '../constants/catalogFilters'
import { normalizeCatalogYearRange } from './catalogFilterHelpers'

const CATALOG_STATE_KEY = 'anicatalog_catalog_state'

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

function normalizeFilters(filters) {
  const base = { ...DEFAULT_CATALOG_FILTERS, ...(filters || {}) }
  const years = normalizeCatalogYearRange(base.yearMin, base.yearMax)
  return { ...base, ...years }
}

export function defaultCatalogState() {
  const filters = { ...DEFAULT_CATALOG_FILTERS }
  return {
    draftFilters: filters,
    appliedFilters: filters,
    view: 'list',
    filterPanelOpen: false,
  }
}

function migrateCatalogState(parsed) {
  const base = defaultCatalogState()
  if (!parsed || typeof parsed !== 'object') return base

  const legacy = parsed.filters
  const draftFilters = normalizeFilters(parsed.draftFilters || legacy || base.draftFilters)
  const appliedFilters = normalizeFilters(parsed.appliedFilters || legacy || base.appliedFilters)

  return {
    draftFilters,
    appliedFilters,
    view: parsed.view === 'grid' ? 'grid' : 'list',
    filterPanelOpen: Boolean(parsed.filterPanelOpen),
  }
}

export function loadCatalogState() {
  return migrateCatalogState(readJson(CATALOG_STATE_KEY, null))
}

export function saveCatalogStateLocal(patch) {
  const cur = loadCatalogState()
  let patchDraft = patch.draftFilters
  let patchApplied = patch.appliedFilters
  if (patch.filters) {
    const legacy = normalizeFilters(patch.filters)
    patchApplied = patchApplied ? { ...legacy, ...patchApplied } : legacy
  }
  const next = {
    ...cur,
    ...patch,
    draftFilters: patchDraft
      ? normalizeFilters({ ...cur.draftFilters, ...patchDraft })
      : cur.draftFilters,
    appliedFilters: patchApplied
      ? normalizeFilters({ ...cur.appliedFilters, ...patchApplied })
      : cur.appliedFilters,
  }
  delete next.filters
  const prevRaw = localStorage.getItem(CATALOG_STATE_KEY)
  const nextRaw = JSON.stringify(next)
  if (prevRaw === nextRaw) return next

  writeJson(CATALOG_STATE_KEY, next)
  window.dispatchEvent(new Event('anicatalog-catalog-state'))
  return next
}

export function catalogFiltersDifferFromDefaults(filters) {
  const d = DEFAULT_CATALOG_FILTERS
  const f = filters || {}
  return (
    Boolean(f.search) ||
    (f.genres?.length ?? 0) > 0 ||
    (f.types?.length ?? 0) > 0 ||
    (f.releaseStatus?.length ?? 0) > 0 ||
    (f.seasons?.length ?? 0) > 0 ||
    (f.ageRatings?.length ?? 0) > 0 ||
    f.sort !== d.sort ||
    f.yearMin !== d.yearMin ||
    f.yearMax !== d.yearMax ||
    (f.category && f.category !== 'all')
  )
}
