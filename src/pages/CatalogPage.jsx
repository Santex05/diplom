import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAnime } from '../context/AnimeContext'
import {
  filterAnimeList,
  parseGenresParam,
  serializeGenresParam,
} from '../utils/filterAnime'
import {
  normalizeCatalogYearRange,
  parseListParam,
  serializeListParam,
} from '../utils/catalogFilterHelpers'
import { DEFAULT_CATALOG_FILTERS } from '../constants/catalogFilters'
import { PAGE_SIZE } from '../constants/catalog'
import { CATALOG_FILTER_COLUMN, PAGE_CONTAINER } from '../constants/layout'
import { useCatalogFilterSticky } from '../hooks/useCatalogFilterSticky'
import { CatalogSkeleton, revealStaggerStyle } from '../components/ui/PageLoader'
import SettingsStorageBadge from '../components/settings/SettingsStorageBadge'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import CatalogFilterPanel from '../components/catalog/CatalogFilterPanel'
import CatalogListRow from '../components/catalog/CatalogListRow'
import CatalogAnimeCard from '../components/CatalogAnimeCard'
import { animeDetailPath, goWatchFirst } from '../utils/animeNav'
import {
  catalogFiltersDifferFromDefaults,
  loadCatalogState,
  saveCatalogStateLocal,
} from '../utils/catalogPrefs'

const SEARCH_APPLY_DEBOUNCE_MS = 320

const CATALOG_FILTER_PARAM_KEYS = [
  'q',
  'genres',
  'types',
  'status',
  'seasons',
  'sort',
  'ymin',
  'ymax',
  'age',
  'category',
]

const catalogToolbarBtn =
  'flex h-11 min-h-11 min-w-0 flex-1 items-center justify-center rounded-xl border border-white/10 bg-bg-card/80 px-3 text-sm font-medium leading-none transition sm:px-4'

const FILTER_COLUMN = 'w-full lg:w-[300px] xl:w-[320px]'

function ensureDraftFilters(raw) {
  return { ...DEFAULT_CATALOG_FILTERS, ...(raw || {}) }
}

function CatalogFilterToggle({ open, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? 'Скрыть фильтры' : 'Показать фильтры'}
      title={open ? 'Скрыть фильтры' : 'Фильтры'}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition ${
        open
          ? 'border-accent/50 bg-accent/15 text-accent'
          : 'border-white/10 bg-bg-card/80 text-white/90 hover:border-white/20 hover:text-white'
      }`}
    >
      {open ? (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
          <path
            d="M4.2 4.2l15.6 15.6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      ) : (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
        </svg>
      )}
    </button>
  )
}

function filtersFromParams(sp) {
  const years = normalizeCatalogYearRange(
    Number(sp.get('ymin')) || DEFAULT_CATALOG_FILTERS.yearMin,
    Number(sp.get('ymax')) || DEFAULT_CATALOG_FILTERS.yearMax,
  )
  return {
    search: sp.get('q') || '',
    genres: parseGenresParam(sp.get('genres')),
    types: parseListParam(sp.get('types')),
    releaseStatus: parseListParam(sp.get('status')),
    seasons: parseListParam(sp.get('seasons')),
    sort: sp.get('sort') || DEFAULT_CATALOG_FILTERS.sort,
    ...years,
    ageRatings: parseListParam(sp.get('age')),
    category: sp.get('category') || 'all',
  }
}

function paramsFromPanelFilters(f) {
  const p = {}
  if (f.genres?.length) p.genres = serializeGenresParam(f.genres)
  if (f.types?.length) p.types = serializeListParam(f.types)
  if (f.releaseStatus?.length) p.status = serializeListParam(f.releaseStatus)
  if (f.seasons?.length) p.seasons = serializeListParam(f.seasons)
  if (f.sort && f.sort !== DEFAULT_CATALOG_FILTERS.sort) p.sort = f.sort
  if (f.yearMin !== DEFAULT_CATALOG_FILTERS.yearMin) p.ymin = String(f.yearMin)
  if (f.yearMax !== DEFAULT_CATALOG_FILTERS.yearMax) p.ymax = String(f.yearMax)
  if (f.ageRatings?.length) p.age = serializeListParam(f.ageRatings)
  if (f.category && f.category !== 'all') p.category = f.category
  return p
}

function paramsFromFilters(f) {
  const p = paramsFromPanelFilters(f)
  if (f.search) p.q = f.search
  return p
}

function mergeAppliedWithDraftPanel(appliedFilters, draftFilters) {
  return {
    ...appliedFilters,
    genres: draftFilters.genres,
    types: draftFilters.types,
    releaseStatus: draftFilters.releaseStatus,
    seasons: draftFilters.seasons,
    sort: draftFilters.sort,
    yearMin: draftFilters.yearMin,
    yearMax: draftFilters.yearMax,
    ageRatings: draftFilters.ageRatings,
    category: draftFilters.category,
  }
}

function panelOpenFromParams(sp) {
  return sp.get('panel') === '1'
}

function viewFromParams(sp) {
  return sp.get('view') === 'grid' ? 'grid' : 'list'
}

export default function CatalogPage() {
  const navigate = useNavigate()
  const { animeList, loading, error } = useAnime()
  const [searchParams, setSearchParams] = useSearchParams()
  const searchKey = searchParams.toString()

  const applied = useMemo(() => filtersFromParams(searchParams), [searchKey])
  const savedCatalog = useMemo(() => loadCatalogState(), [])
  const [draft, setDraft] = useState(() => ensureDraftFilters(savedCatalog.draftFilters))
  const [panelOpen, setPanelOpen] = useState(
    () =>
      panelOpenFromParams(searchParams) ||
      (savedCatalog.filterPanelOpen && !searchParams.has('panel')),
  )
  const [view, setView] = useState(() => {
    if (searchParams.has('view')) return viewFromParams(searchParams)
    return savedCatalog.view === 'grid' ? 'grid' : 'list'
  })
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const loadMoreRef = useRef(null)
  const catalogRestoredRef = useRef(false)
  const lastPersistedRef = useRef('')
  const { columnRef, panelRef, rowRef } = useCatalogFilterSticky(panelOpen)

  const persistCatalog = useCallback((patch) => {
    const key = JSON.stringify(patch)
    if (key === lastPersistedRef.current) return
    lastPersistedRef.current = key
    saveCatalogStateLocal(patch)
  }, [])

  const syncUrlFromFilters = useCallback(
    (filters) => {
      const next = new URLSearchParams(paramsFromFilters(filters))
      if (panelOpen) next.set('panel', '1')
      if (view === 'grid') next.set('view', 'grid')
      setSearchParams(next)
      setVisibleCount(PAGE_SIZE)
    },
    [panelOpen, view, setSearchParams],
  )

  const syncSearchToUrl = useCallback(
    (query) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          const q = query.trim()
          if (q) next.set('q', q)
          else next.delete('q')
          return next
        },
        { replace: true },
      )
      setVisibleCount(PAGE_SIZE)
    },
    [setSearchParams],
  )

  useEffect(() => {
    if (catalogRestoredRef.current) return
    catalogRestoredRef.current = true
    const saved = loadCatalogState()
    const urlHasFilters = CATALOG_FILTER_PARAM_KEYS.some((k) => searchParams.has(k))
    if (!urlHasFilters && catalogFiltersDifferFromDefaults(saved.appliedFilters)) {
      const next = new URLSearchParams(paramsFromFilters(saved.appliedFilters))
      if (saved.filterPanelOpen) next.set('panel', '1')
      if (saved.view === 'grid') next.set('view', 'grid')
      setSearchParams(next, { replace: true })
    }
  }, [searchKey, setSearchParams, searchParams])

  useEffect(() => {
    if (draft.search === applied.search) return undefined
    const id = window.setTimeout(() => syncSearchToUrl(draft.search), SEARCH_APPLY_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [draft.search, applied.search, syncSearchToUrl])

  useEffect(() => {
    persistCatalog({ draftFilters: draft })
  }, [draft, persistCatalog])

  useEffect(() => {
    const flushDraft = () => persistCatalog({ draftFilters: draft })
    window.addEventListener('anicatalog-flush-catalog-draft', flushDraft)
    return () => window.removeEventListener('anicatalog-flush-catalog-draft', flushDraft)
  }, [draft, persistCatalog])

  useEffect(() => {
    const syncAfterAuth = () => {
      const saved = loadCatalogState()
      setDraft(ensureDraftFilters(saved.draftFilters))
      setPanelOpen(saved.filterPanelOpen)
      setView(saved.view === 'grid' ? 'grid' : 'list')
      const next = new URLSearchParams(paramsFromFilters(saved.appliedFilters))
      if (saved.filterPanelOpen) next.set('panel', '1')
      if (saved.view === 'grid') next.set('view', 'grid')
      setSearchParams(next, { replace: true })
      setVisibleCount(PAGE_SIZE)
      lastPersistedRef.current = ''
    }
    window.addEventListener('anicatalog-settings-scope', syncAfterAuth)
    return () => window.removeEventListener('anicatalog-settings-scope', syncAfterAuth)
  }, [setSearchParams])

  useEffect(() => {
    persistCatalog({
      appliedFilters: applied,
      view,
      filterPanelOpen: panelOpen,
    })
  }, [applied, view, panelOpen, persistCatalog])

  useEffect(() => {
    const urlPanel = panelOpenFromParams(searchParams)
    const urlView = viewFromParams(searchParams)
    if (urlPanel === panelOpen && urlView === view) return

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (panelOpen) next.set('panel', '1')
        else next.delete('panel')
        if (view === 'grid') next.set('view', 'grid')
        else next.delete('view')
        return next
      },
      { replace: true },
    )
  }, [panelOpen, view, searchKey, setSearchParams, searchParams])

  const filtered = useMemo(
    () =>
      filterAnimeList(animeList, {
        category: applied.category,
        genres: applied.genres,
        search: applied.search,
        types: applied.types,
        releaseStatus: applied.releaseStatus,
        seasons: applied.seasons,
        sort: applied.sort,
        yearMin: applied.yearMin,
        yearMax: applied.yearMax,
        ageRatings: applied.ageRatings,
      }),
    [animeList, applied],
  )

  const visible = filtered.slice(0, visibleCount)

  useEffect(() => {
    const node = loadMoreRef.current
    if (!node || visible.length >= filtered.length) return undefined
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length))
        }
      },
      { rootMargin: '200px' },
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [visible.length, filtered.length])

  const applyPanelFilters = useCallback(() => {
    const merged = mergeAppliedWithDraftPanel(applied, draft)
    merged.search = applied.search
    syncUrlFromFilters(merged)
    persistCatalog({
      appliedFilters: merged,
      draftFilters: { ...draft, search: applied.search },
    })
  }, [applied, draft, syncUrlFromFilters, persistCatalog])

  const resetFilters = () => {
    const defaults = { ...DEFAULT_CATALOG_FILTERS }
    const keptSearch = applied.search
    const nextFilters = { ...defaults, search: keptSearch }
    const next = new URLSearchParams(paramsFromPanelFilters(defaults))
    if (keptSearch) next.set('q', keptSearch)
    if (panelOpen) next.set('panel', '1')
    if (view === 'grid') next.set('view', 'grid')
    setSearchParams(next)
    setDraft(nextFilters)
    lastPersistedRef.current = ''
    persistCatalog({
      appliedFilters: nextFilters,
      draftFilters: nextFilters,
    })
    setVisibleCount(PAGE_SIZE)
  }

  return (
    <div className="page-mesh flex min-h-screen flex-col bg-bg-dark text-white">
      <Navbar />

      <main className={`${PAGE_CONTAINER} relative flex-1 pb-16`}>
        <div className="mb-8 pt-8">
          <h1 className="font-display text-3xl font-bold md:text-4xl">Каталог релизов</h1>
          <p className="mt-2 text-sm text-text-muted">
            {loading ? 'Загрузка…' : `${filtered.length} тайтлов в каталоге`}
          </p>
          <SettingsStorageBadge className="mt-2" />
        </div>

        <div className="mb-6 flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-6">
          <input
            type="search"
            value={draft.search ?? ''}
            onChange={(e) => setDraft({ ...draft, search: e.target.value })}
            placeholder="Поиск по каталогу…"
            className="h-11 min-h-11 w-full min-w-0 flex-1 rounded-xl border border-white/10 bg-bg-card/80 px-4 text-sm leading-normal text-white placeholder:text-text-muted focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20"
          />
          <div className={`flex h-11 w-full shrink-0 gap-2 ${FILTER_COLUMN}`}>
            <CatalogFilterToggle open={panelOpen} onClick={() => setPanelOpen((v) => !v)} />
            <button
              type="button"
              onClick={() => setView((v) => (v === 'list' ? 'grid' : 'list'))}
              className={`${catalogToolbarBtn} text-text-muted hover:border-white/20 hover:text-white`}
            >
              <span className="truncate">{view === 'list' ? 'Сетка' : 'Список'}</span>
            </button>
            <button
              type="button"
              onClick={applyPanelFilters}
              className="flex h-11 min-h-11 min-w-0 flex-1 items-center justify-center rounded-xl bg-accent px-3 text-sm font-semibold leading-none text-bg-dark transition hover:bg-accent-btn sm:px-4"
            >
              <span className="truncate">Применить</span>
            </button>
          </div>
        </div>

        <div
          ref={rowRef}
          className="flex flex-col gap-6 lg:flex-row-reverse lg:items-start lg:gap-6"
        >
          {panelOpen && (
            <aside className={`${FILTER_COLUMN} min-w-0 shrink-0`}>
              <div ref={columnRef} className={`${CATALOG_FILTER_COLUMN} w-full min-w-0`}>
                <CatalogFilterPanel
                  ref={panelRef}
                  draft={draft}
                  onChange={setDraft}
                  onApply={applyPanelFilters}
                  onReset={resetFilters}
                />
              </div>
            </aside>
          )}

          <div className="min-w-0 flex-1 lg:order-2">
            {loading && <CatalogSkeleton count={12} />}
            {error && <p className="text-red-400">{error}</p>}

            {!loading && !error && view === 'list' && (
              <div className="space-y-4">
                {visible.map((anime, i) => (
                  <div key={anime.id} className="content-reveal" style={revealStaggerStyle(i, 35, 400)}>
                    <CatalogListRow
                      anime={anime}
                      index={i}
                      onClick={() => navigate(animeDetailPath(anime.id))}
                      onWatch={(a) => goWatchFirst(navigate, a)}
                    />
                  </div>
                ))}
              </div>
            )}

            {!loading && !error && view === 'grid' && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
                {visible.map((anime, i) => (
                  <div key={anime.id} className="content-reveal" style={revealStaggerStyle(i, 40, 480)}>
                    <CatalogAnimeCard
                      anime={anime}
                      index={i}
                      onClick={() => navigate(animeDetailPath(anime.id))}
                    />
                  </div>
                ))}
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="rounded-2xl border border-white/[0.08] bg-bg-card/50 py-16 text-center text-text-muted">
                Ничего не найдено. Измените фильтры.
              </div>
            )}

            {visible.length < filtered.length && (
              <div ref={loadMoreRef} className="mt-10 flex justify-center py-4">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-accent" aria-hidden />
                <span className="sr-only">Загрузка…</span>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
