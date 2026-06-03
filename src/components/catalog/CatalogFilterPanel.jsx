import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { ALL_GENRE_KEYS, genreLabel } from '../../constants/genres'
import { ANIME_SEASONS } from '../../constants/animeMeta'
import {
  AGE_RATING_OPTIONS,
  CATALOG_TYPE_OPTIONS,
  CATALOG_YEAR_MAX,
  CATALOG_YEAR_MIN,
  DEFAULT_CATALOG_FILTERS,
  RELEASE_STATUS_OPTIONS,
  SORT_OPTIONS,
} from '../../constants/catalogFilters'
import { CATALOG_FILTER_STICKY } from '../../constants/layout'
import { normalizeCatalogYearRange } from '../../utils/catalogFilterHelpers'
import DualRangeSlider from '../ui/DualRangeSlider'
import DropdownPortal from '../ui/DropdownPortal'

function useDropdownDismiss(open, setOpen, anchorRef) {
  useEffect(() => {
    if (!open) return undefined
    const close = (e) => {
      if (anchorRef.current?.contains(e.target)) return
      if (e.target.closest('[data-dropdown-menu]')) return
      setOpen(false)
    }
    const timer = window.setTimeout(() => {
      document.addEventListener('mousedown', close)
    }, 0)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('mousedown', close)
    }
  }, [open, setOpen, anchorRef])
}

function ToggleGroup({
  options,
  value,
  onChange,
  getKey = (o) => o.id ?? o.value,
  getLabel = (o) => o.label,
  stretch = false,
}) {
  return (
    <div className={stretch ? 'flex gap-1.5' : 'flex flex-wrap gap-2'}>
      {options.map((opt) => {
        const key = getKey(opt)
        const active = value.includes(key)
        return (
          <button
            key={key}
            type="button"
            onClick={() =>
              onChange(active ? value.filter((v) => v !== key) : [...value, key])
            }
            className={`rounded-xl py-2 text-sm font-medium transition ${
              stretch ? 'min-w-0 flex-1 px-1 text-center' : 'px-2.5'
            } ${
              active
                ? 'bg-accent text-bg-dark'
                : 'border border-white/10 bg-white/[0.03] text-text-muted hover:text-white'
            }`}
          >
            {getLabel(opt)}
          </button>
        )
      })}
    </div>
  )
}

function FilterSection({ title, hint, children }) {
  return (
    <section className="min-w-0 border-b border-white/[0.06] py-4 last:border-0">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      {hint && <p className="mt-0.5 text-xs text-text-muted">{hint}</p>}
      <div className="mt-2.5">{children}</div>
    </section>
  )
}

const CatalogFilterPanel = forwardRef(function CatalogFilterPanel(
  { draft, onChange, onApply, onReset },
  ref,
) {
  const [genreOpen, setGenreOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const genreBtnRef = useRef(null)
  const sortBtnRef = useRef(null)

  useDropdownDismiss(genreOpen, setGenreOpen, genreBtnRef)
  useDropdownDismiss(sortOpen, setSortOpen, sortBtnRef)

  const genreKeys = useMemo(
    () => [...ALL_GENRE_KEYS].sort((a, b) => genreLabel(a).localeCompare(genreLabel(b), 'ru')),
    [],
  )

  const sortMeta = SORT_OPTIONS.find((s) => s.id === draft.sort) || SORT_OPTIONS[0]

  const patch = (p) => onChange({ ...draft, ...p })

  const toggleGenre = (key) => {
    const g = draft.genres || []
    patch({
      genres: g.includes(key) ? g.filter((x) => x !== key) : [...g, key],
    })
  }

  return (
    <aside
      ref={ref}
      className={`${CATALOG_FILTER_STICKY} w-full min-w-0 rounded-2xl border border-white/[0.08] bg-bg-card/95 p-4 shadow-lg shadow-black/20 backdrop-blur-md`}
    >
      <FilterSection
        title="Жанры"
        hint="При выборе нескольких используется комбинация"
      >
        <button
          ref={genreBtnRef}
          type="button"
          onClick={() => {
            setSortOpen(false)
            setGenreOpen((v) => !v)
          }}
          className="flex min-h-[2.75rem] w-full flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-bg-dark/80 px-3 py-2 text-left text-sm"
        >
          {(draft.genres?.length ?? 0) > 0 ? (
            draft.genres.map((key) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-0.5 text-xs text-white"
              >
                {genreLabel(key)}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleGenre(key)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation()
                      toggleGenre(key)
                    }
                  }}
                  className="text-text-muted hover:text-white"
                >
                  ×
                </span>
              </span>
            ))
          ) : (
            <span className="text-text-muted">Укажите жанры</span>
          )}
          <span className="ml-auto text-xs text-text-muted">{genreOpen ? '▲' : '▼'}</span>
        </button>
        <DropdownPortal
          anchorRef={genreBtnRef}
          open={genreOpen}
          maxHeight={208}
          className="catalog-scroll p-2"
        >
          {genreKeys.map((key) => {
            const active = draft.genres?.includes(key)
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleGenre(key)}
                className={`mb-0.5 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition duration-200 ease-out ${
                  active ? 'bg-accent/15 text-accent' : 'text-text-muted hover:bg-white/5 hover:text-white'
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    active ? 'border-accent bg-accent text-bg-dark' : 'border-white/25'
                  }`}
                >
                  {active ? '✓' : ''}
                </span>
                {genreLabel(key)}
              </button>
            )
          })}
        </DropdownPortal>
      </FilterSection>

      <FilterSection title="Тип">
        <ToggleGroup
          options={CATALOG_TYPE_OPTIONS}
          value={draft.types || []}
          onChange={(types) => patch({ types })}
          getKey={(o) => o.value}
        />
      </FilterSection>

      <FilterSection title="Статус выхода">
        <ToggleGroup
          options={RELEASE_STATUS_OPTIONS}
          value={draft.releaseStatus || []}
          onChange={(releaseStatus) => patch({ releaseStatus })}
        />
      </FilterSection>

      <FilterSection title="Сортировка">
        <button
          ref={sortBtnRef}
          type="button"
          onClick={() => {
            setGenreOpen(false)
            setSortOpen((v) => !v)
          }}
          className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-bg-dark/80 px-3 py-2.5 text-left text-sm"
        >
          <span className="text-white">{sortMeta.label}</span>
          <span className="text-xs text-text-muted">{sortOpen ? '▲' : '▼'}</span>
        </button>
        <DropdownPortal
          anchorRef={sortBtnRef}
          open={sortOpen}
          maxHeight={224}
          className="catalog-scroll py-0"
        >
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                patch({ sort: opt.id })
                setSortOpen(false)
              }}
              className={`block w-full border-b border-white/[0.04] px-3 py-2.5 text-left last:border-0 hover:bg-white/5 ${
                draft.sort === opt.id ? 'bg-accent/10' : ''
              }`}
            >
              <p className="text-sm font-medium text-white">{opt.label}</p>
              <p className="text-xs text-text-muted">{opt.hint}</p>
            </button>
          ))}
        </DropdownPortal>
      </FilterSection>

      <FilterSection title="Сезоны">
        <ToggleGroup
          options={ANIME_SEASONS}
          value={draft.seasons || []}
          onChange={(seasons) => patch({ seasons })}
          getKey={(o) => o.value}
        />
      </FilterSection>

      <FilterSection title="Период выхода" hint="Диапазон годов выхода релиза">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm font-medium text-white">
            <span>{draft.yearMin}</span>
            <span>{draft.yearMax}</span>
          </div>
          <DualRangeSlider
            min={CATALOG_YEAR_MIN}
            max={CATALOG_YEAR_MAX}
            valueMin={draft.yearMin}
            valueMax={draft.yearMax}
            onChange={(yearMin, yearMax) =>
              patch(normalizeCatalogYearRange(yearMin, yearMax))
            }
          />
        </div>
      </FilterSection>

      <FilterSection title="Возрастной рейтинг">
        <ToggleGroup
          stretch
          options={AGE_RATING_OPTIONS.map((a) => ({ id: a, label: a }))}
          value={draft.ageRatings || []}
          onChange={(ageRatings) => patch({ ageRatings })}
        />
      </FilterSection>

      <div className="mt-3 flex gap-2 pt-1">
        <button
          type="button"
          onClick={onApply}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-sm font-semibold text-bg-dark hover:bg-accent-btn"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Применить
        </button>
        <button
          type="button"
          onClick={() => {
            onChange({ ...DEFAULT_CATALOG_FILTERS })
            onReset()
          }}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm text-text-muted hover:text-white"
        >
          Сбросить
        </button>
      </div>
    </aside>
  )
})

export default CatalogFilterPanel
