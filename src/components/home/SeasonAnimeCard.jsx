import AnimePoster from '../AnimePoster'
import { displayRating } from '../../utils/displayRating'

export default function SeasonAnimeCard({ anime, onClick, onWatch, index = 0 }) {
  const rating = displayRating(anime)
  const episodeLabel =
    anime.episodeCount > 0
      ? `${anime.episodeCount} ${anime.episodeCount === 1 ? 'серия' : anime.episodeCount < 5 ? 'серии' : 'серий'}`
      : 'Скоро'

  return (
    <article
      className="home-fade-up group relative z-0 flex flex-col hover:z-20"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onClick?.(anime)}
        onKeyDown={(e) => e.key === 'Enter' && onClick?.(anime)}
        className="relative cursor-pointer overflow-hidden rounded-xl border border-white/[0.06] bg-bg-card shadow-lg shadow-black/30 transition duration-300 hover:-translate-y-1.5 hover:border-accent/35 hover:shadow-accent/10"
      >
        <AnimePoster
          cover={anime.cover}
          alt={anime.title}
          className="aspect-[2/3] w-full"
          imgClassName="transition duration-500 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 transition group-hover:opacity-100" />
        {rating != null && (
          <span className="absolute right-2.5 top-2.5 rounded-lg border border-white/10 bg-black/55 px-2 py-0.5 text-xs font-bold tabular-nums text-white backdrop-blur-md">
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
            className="absolute bottom-3 left-1/2 z-10 w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-xl bg-accent/90 py-2 text-xs font-semibold text-bg-dark opacity-0 transition duration-300 group-hover:opacity-100 hover:bg-accent"
          >
            Смотреть
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onClick?.(anime)}
        className="mt-3 w-full cursor-pointer text-left"
      >
        <h3 className="line-clamp-2 text-sm font-semibold text-white transition group-hover:text-accent">
          {anime.title}
        </h3>
        <p className="mt-1 text-xs text-text-muted">{episodeLabel}</p>
      </button>
    </article>
  )
}
