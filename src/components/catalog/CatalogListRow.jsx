import AnimePoster from '../AnimePoster'
import FavoriteStarButton from '../FavoriteStarButton'
import ListStatusButton from '../ListStatusButton'
import WatchQueueButton from '../WatchQueueButton'
import { actionBtnPrimary } from '../../constants/ui'
import { formatGenresList } from '../../constants/genres'
import { animeSeasonLabel, animeTypeLabel, resolveAnimeSeason, resolveAnimeType } from '../../constants/animeMeta'
import { resolveAgeRating } from '../../utils/catalogFilterHelpers'
import { displayRating } from '../../utils/displayRating'

export default function CatalogListRow({ anime, onClick, onWatch, index = 0 }) {
  const rating = displayRating(anime)
  const meta = [
    formatGenresList(anime.genres, 2, ' • '),
    anime.year,
    animeSeasonLabel(resolveAnimeSeason(anime)),
    animeTypeLabel(resolveAnimeType(anime)),
    resolveAgeRating(anime),
  ]
    .filter(Boolean)
    .join(' • ')

  return (
    <article
      className="home-fade-up group relative flex gap-4 overflow-visible rounded-2xl border border-white/[0.08] bg-bg-card/70 p-4 transition hover:border-accent/25 hover:bg-bg-card"
      style={{ animationDelay: `${(index % 8) * 40}ms` }}
    >
      <button
        type="button"
        onClick={() => onClick?.(anime)}
        className="relative h-36 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 sm:h-40 sm:w-28"
      >
        <AnimePoster
          cover={anime.cover}
          alt={anime.title}
          className="absolute inset-0 h-full w-full"
        />
      </button>

      <div className="flex min-w-0 flex-1 flex-col">
        <button type="button" onClick={() => onClick?.(anime)} className="text-left">
          <h3 className="font-display line-clamp-2 text-lg font-bold text-white transition group-hover:text-accent">
            {anime.title}
          </h3>
          <p className="mt-1 text-xs text-text-muted">{meta}</p>
        </button>

        {anime.description && (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/65">{anime.description}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {onWatch && (
            <button type="button" onClick={() => onWatch(anime)} className={actionBtnPrimary}>
              <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Смотреть
            </button>
          )}
          <FavoriteStarButton animeId={anime.id} />
          <ListStatusButton
            animeId={anime.id}
            animeTitle={anime.title}
            cover={anime.cover}
            variant="compact"
          />
          <WatchQueueButton
            animeId={anime.id}
            animeTitle={anime.title}
            cover={anime.cover}
            variant="compact"
            className="ml-auto"
          />
          {rating != null && (
            <span className="rounded-xl border border-white/10 bg-black/40 px-2 py-1 text-xs font-bold tabular-nums text-white">
              ★ {rating}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
