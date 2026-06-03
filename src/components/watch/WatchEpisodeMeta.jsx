import { genreLabel } from '../../constants/genres'
import FavoriteStarButton from '../FavoriteStarButton'
import ListStatusButton from '../ListStatusButton'
import ShareMenu from './ShareMenu'
import WatchQueueButton from '../WatchQueueButton'

export default function WatchEpisodeMeta({ anime, episode, shareUrl, playbackTime = 0 }) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-bg-card/50 p-6 backdrop-blur-sm md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
            {anime.title}
          </p>
          <h1 className="font-display mt-2 text-2xl font-bold leading-tight text-accent md:text-3xl">
            Серия {episode.number}: {episode.title}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <FavoriteStarButton animeId={anime.id} size="sm" />
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
            episodeId={episode.id}
            episodeTitle={episode.title}
            episodeNumber={episode.number}
            variant="compact"
          />
          <ShareMenu url={shareUrl} currentTime={playbackTime} />
        </div>
      </div>

      {(anime.genres ?? []).length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {anime.genres.map((g) => (
            <span
              key={g}
              className="rounded-full border border-sky-400/25 bg-sky-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-300"
            >
              {genreLabel(g)}
            </span>
          ))}
        </div>
      )}

      {episode.description && (
        <div className="mt-6">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-text-muted">
            Описание серии
          </h2>
          <p className="text-sm leading-relaxed text-white/75 md:text-base">
            {episode.description}
          </p>
        </div>
      )}

      {!episode.description && anime.description && (
        <div className="mt-6">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-text-muted">
            О аниме
          </h2>
          <p className="line-clamp-4 text-sm leading-relaxed text-white/70">{anime.description}</p>
        </div>
      )}
    </section>
  )
}
