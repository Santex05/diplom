import { CATEGORIES } from '../constants/catalog'
import { ALL_GENRE_KEYS, genreLabel } from '../constants/genres'

const chipBase =
  'rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200'
const chipActive = 'bg-accent text-bg-dark shadow-md shadow-accent/20'
const chipIdle =
  'border border-white/[0.08] bg-white/[0.03] text-text-muted hover:border-accent/30 hover:text-white'

export default function CatalogFilters({
  category,
  selectedGenres,
  onCategoryChange,
  onGenresChange,
}) {
  const hasGenreFilter = selectedGenres.length > 0

  const genreKeys = [...ALL_GENRE_KEYS].sort((a, b) =>
    genreLabel(a).localeCompare(genreLabel(b), 'ru'),
  )

  function toggleGenre(key) {
    if (selectedGenres.includes(key)) {
      onGenresChange(selectedGenres.filter((g) => g !== key))
    } else {
      onGenresChange([...selectedGenres, key])
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-text-muted">
          Категории
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CATEGORIES.map((cat) => {
            const active = category === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategoryChange(cat.id)}
                className={`rounded-2xl border px-4 py-3.5 text-left transition duration-200 ${
                  active
                    ? 'border-accent/50 bg-accent/15 shadow-lg shadow-accent/10'
                    : 'border-white/[0.08] bg-bg-card/60 hover:border-accent/25 hover:bg-bg-card'
                }`}
              >
                <span
                  className={`block text-sm font-semibold ${active ? 'text-accent' : 'text-white'}`}
                >
                  {cat.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-muted">Жанры</p>
          {hasGenreFilter && (
            <button
              type="button"
              onClick={() => onGenresChange([])}
              className="text-xs font-medium text-accent transition hover:text-accent-btn"
            >
              Сбросить жанры
            </button>
          )}
        </div>
        <p className="mb-3 text-xs text-text-muted">
          Можно выбрать несколько — покажем аниме со всеми выбранными жанрами
        </p>
        <div className="max-h-[280px] overflow-y-auto rounded-2xl border border-white/[0.08] bg-bg-card/40 p-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onGenresChange([])}
              className={`${chipBase} ${!hasGenreFilter ? chipActive : chipIdle}`}
            >
              Все жанры
            </button>
            {genreKeys.map((key) => {
              const active = selectedGenres.includes(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleGenre(key)}
                  className={`${chipBase} ${active ? chipActive : chipIdle}`}
                >
                  {genreLabel(key)}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
