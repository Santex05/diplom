import AnimePoster from '../AnimePoster'
import { formatGenresList } from '../../constants/genres'

export default function LandscapeAnimeCard({ anime, onClick, index = 0 }) {
  return (
    <article
      className="home-fade-up group relative z-0 hover:z-20"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <button
        type="button"
        onClick={() => onClick?.(anime)}
        className="relative w-full cursor-pointer overflow-visible rounded-2xl border border-white/[0.06] bg-bg-card text-left shadow-lg shadow-black/25 transition duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-accent/10"
      >
        <AnimePoster
          cover={anime.cover}
          alt={anime.title}
          className="aspect-[16/9] w-full"
          imgClassName="aspect-[16/9] w-full object-cover object-center transition duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="text-base font-semibold text-white transition group-hover:text-accent sm:text-lg">
            {anime.title}
          </h3>
          {anime.genres?.length > 0 && (
            <p className="mt-1 text-xs text-text-muted sm:text-sm">
              {formatGenresList(anime.genres, 3, ' • ')}
            </p>
          )}
        </div>
      </button>
    </article>
  )
}
