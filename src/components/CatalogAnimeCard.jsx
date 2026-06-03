import AnimePoster from './AnimePoster'
import FavoriteStarButton from './FavoriteStarButton'
import ListStatusButton from './ListStatusButton'
import WatchQueueButton from './WatchQueueButton'
import { formatGenresList } from '../constants/genres'
import { animeTypeLabel, resolveAnimeType } from '../constants/animeMeta'
import { displayRating } from '../utils/displayRating'

export default function CatalogAnimeCard({ anime, onClick, onWatch, index = 0 }) {
  const rating = displayRating(anime)
  const genresLabel = formatGenresList(anime.genres, 2, ' · ') || '—'
  const typeLabel = animeTypeLabel(resolveAnimeType(anime))
  const episodeLabel =
    anime.episodeCount > 0
      ? `${anime.episodeCount} ${anime.episodeCount === 1 ? 'серия' : anime.episodeCount < 5 ? 'серии' : 'серий'}`
      : null

  return (
    <article
      className="home-fade-up group relative z-0 flex flex-col hover:z-[50]"
      style={{ animationDelay: `${(index % 12) * 40}ms` }}
    >
      <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-bg-card shadow-lg shadow-black/25 transition duration-300 hover:-translate-y-1 hover:border-accent/30">
        <div
          role="button"
          tabIndex={0}
          onClick={() => onClick?.(anime)}
          onKeyDown={(e) => e.key === 'Enter' && onClick?.(anime)}
          className="relative block cursor-pointer overflow-hidden rounded-xl"
        >
          <AnimePoster
            cover={anime.cover}
            alt={anime.title}
            className="aspect-[2/3] w-full"
            imgClassName="aspect-[2/3] w-full object-cover object-center transition duration-500 group-hover:scale-[1.03]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

          <div className="absolute left-2 top-2 z-10 flex gap-1" onClick={(e) => e.stopPropagation()}>
            <ListStatusButton
              animeId={anime.id}
              animeTitle={anime.title}
              cover={anime.cover}
              variant="pill"
            />
          </div>

          {rating != null && (
            <span className="absolute right-2 top-2 z-10 rounded-lg border border-white/10 bg-black/55 px-2 py-0.5 text-xs font-bold tabular-nums text-white backdrop-blur-md">
              ★ {rating}
            </span>
          )}

          {onWatch && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onWatch(anime)
              }}
              className="absolute inset-0 z-[5] flex items-center justify-center opacity-0 transition group-hover:opacity-100"
              title="Смотреть"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-accent/35 bg-accent/20 text-accent shadow-lg shadow-black/30 backdrop-blur-sm">
                <svg className="h-6 w-6 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </button>
          )}
        </div>

        <div
          className="absolute bottom-2 right-2 z-20 flex items-center gap-1.5 opacity-0 transition group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <FavoriteStarButton animeId={anime.id} />
          <WatchQueueButton
            animeId={anime.id}
            animeTitle={anime.title}
            cover={anime.cover}
            variant="compact"
          />
        </div>
      </div>

      <button type="button" onClick={() => onClick?.(anime)} className="mt-3 w-full text-left">
        <h3 className="line-clamp-2 text-sm font-semibold text-white group-hover:text-accent">
          {anime.title}
        </h3>
        <p className="mt-1 line-clamp-1 text-xs text-text-muted">{genresLabel}</p>
        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-text-muted/80">
          {[typeLabel, episodeLabel, anime.year].filter(Boolean).join(' · ')}
        </p>
      </button>
    </article>
  )
}
