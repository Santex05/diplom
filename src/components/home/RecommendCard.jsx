import AnimePoster from '../AnimePoster'
import { formatGenresList } from '../../constants/genres'
import { displayRating } from '../../utils/displayRating'

export default function RecommendCard({ anime, onClick, index = 0 }) {
  const rating = displayRating(anime)
  const genres = formatGenresList(anime.genres, 2, ' · ')

  return (
    <article
      className="home-fade-up w-[148px] shrink-0 snap-start sm:w-[168px]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <button
        type="button"
        onClick={() => onClick?.(anime)}
        className="group relative w-full overflow-hidden rounded-xl border border-white/[0.06] bg-bg-card text-left shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-accent/30"
      >
        <AnimePoster
          cover={anime.cover}
          alt={anime.title}
          className="aspect-[2/3] w-full"
          imgClassName="aspect-[2/3] w-full object-cover transition duration-500 group-hover:scale-[1.04]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        {rating != null && (
          <span className="absolute right-2 top-2 rounded-md border border-white/10 bg-black/55 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
            ★ {rating}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-white group-hover:text-accent">
            {anime.title}
          </h3>
          {genres && (
            <p className="mt-1 line-clamp-1 text-[10px] text-white/55">{genres}</p>
          )}
        </div>
      </button>
    </article>
  )
}
