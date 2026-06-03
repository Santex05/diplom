import AnimePoster from './AnimePoster'
import { formatGenresList } from '../constants/genres'

export default function AnimeCard({
  anime,
  onClick,
  onWatch,
  size = 'default',
  showRating = true,
  showMeta = true,
  hit = false,
}) {
  const isLarge = size === 'large'
  const isCompact = size === 'compact'
  const badge = anime.episodeCount > 0 ? String(anime.episodeCount) : null

  const openDetail = () => onClick?.(anime)

  return (
    <div className="group w-full text-left transition-all duration-200 hover:scale-[1.03]">
      <div
        role="button"
        tabIndex={0}
        onClick={openDetail}
        onKeyDown={(e) => e.key === 'Enter' && openDetail()}
        className={`relative cursor-pointer overflow-hidden rounded-xl bg-[#141820] ${isLarge ? 'mb-4' : 'mb-3'}`}
      >
        <AnimePoster
          cover={anime.cover}
          alt={anime.title}
          className="aspect-[2/3] w-full"
          imgClassName="aspect-[2/3] w-full object-cover object-center transition group-hover:brightness-110"
        />
        {showRating && badge && (
          <span className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
            {badge}
          </span>
        )}
        {hit && (
          <span className="absolute bottom-3 left-3 rounded-md bg-[#c4b5fd] px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-[#1e1b4b]">
            ХИТ
          </span>
        )}
        {onWatch && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onWatch(anime)
            }}
            className="absolute bottom-3 right-3 z-10 rounded-lg bg-[#c4b5fd] px-3 py-1.5 text-xs font-semibold text-[#1e1b4b] shadow-lg transition hover:bg-[#ddd6fe]"
          >
            Смотреть
          </button>
        )}
      </div>
      <button type="button" onClick={openDetail} className="w-full cursor-pointer text-left">
        <h3
          className={`line-clamp-2 font-medium text-white ${isCompact ? 'text-center text-xs' : 'text-sm'}`}
        >
          {anime.title}
        </h3>
        {showMeta && !isCompact && (
          <div className="mt-1 space-y-0.5">
            <p className="text-xs font-medium text-[#9ca3af]">
              {anime.episodeCount > 0
                ? `${anime.episodeCount} серий`
                : 'Нет серий'}
              {anime.year ? ` · ${anime.year}` : ''}
            </p>
            {anime.genres?.length > 0 && (
              <p className="line-clamp-1 text-[10px] uppercase tracking-wide text-[#6b7280]">
                {formatGenresList(anime.genres, 2)}
              </p>
            )}
          </div>
        )}
      </button>
    </div>
  )
}
