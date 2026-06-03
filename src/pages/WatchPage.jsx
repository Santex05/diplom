import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { useWatchAnime } from '../hooks/useWatchAnime'
import { animeDetailPath } from '../utils/animeNav'
import { queueEntryId } from '../utils/playbackQueue'
import VideoPlayer from '../components/VideoPlayer'
import { useQueue } from '../context/QueueContext'
import { useAnime } from '../context/AnimeContext'
import { findEpisode, findAnimeById, watchPath } from '../utils/watch'
import { goWatchFromQueue } from '../utils/animeNav'
import { loadSitePrefs } from '../utils/sitePrefs'

function normalizeId(value) {
  if (value == null || value === '') return ''
  try {
    return decodeURIComponent(String(value))
  } catch {
    return String(value)
  }
}

function WatchLoading({ message }) {
  return (
    <div className="flex h-[100dvh] items-center justify-center bg-black text-text-muted">
      {message}
    </div>
  )
}

export default function WatchPage() {
  const params = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const episodeId = normalizeId(params.episodeId)
  const { anime, error } = useWatchAnime(params.animeId)
  const { getNextInQueue, removeFromQueue } = useQueue()
  const { animeList } = useAnime()

  const epData = anime ? findEpisode(anime, episodeId) : null
  const episode = epData?.episode

  const sortedEpisodes = anime
    ? [...(anime.episodes || [])].sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
    : []

  const sortedIndex = episode
    ? sortedEpisodes.findIndex((ep) => String(ep.id) === String(episode.id))
    : -1
  const hasPrev = sortedIndex > 0
  const hasNext = sortedIndex >= 0 && sortedIndex < sortedEpisodes.length - 1

  const goEpisode = (ep, opts = {}) => {
    if (!anime?.id || !ep?.id) return
    const prefs = loadSitePrefs()
    const alreadyFs = Boolean(document.fullscreenElement)
    if (alreadyFs) {
      sessionStorage.setItem('anicatalog_keep_fs', '1')
    } else {
      sessionStorage.removeItem('anicatalog_keep_fs')
    }
    const requestFullscreen =
      alreadyFs || Boolean(opts.requestFullscreen ?? prefs.autoFullscreen)
    navigate(watchPath(anime.id, ep.id), {
      state: {
        anime,
        autoPlay: opts.autoPlay ?? true,
        requestFullscreen,
      },
    })
  }

  const autoPlayOnStart = Boolean(location.state?.autoPlay)
  const requestFullscreenOnStart = Boolean(location.state?.requestFullscreen)

  useEffect(() => {
    document.documentElement.classList.add('watch-cinema-active')
    return () => document.documentElement.classList.remove('watch-cinema-active')
  }, [])

  const handleSeriesEnded = () => {
    if (!anime || !episode) return
    const entryId = queueEntryId(anime.id, episode.id)
    removeFromQueue(anime.id, episode.id)
    const next = getNextInQueue(entryId)
    if (!next) return
    const nextAnime = findAnimeById(animeList, next.animeId)
    if (!nextAnime) return
    const prefs = loadSitePrefs()
    const wasFs = Boolean(document.fullscreenElement)
    if (wasFs) {
      sessionStorage.setItem('anicatalog_keep_fs', '1')
    } else {
      sessionStorage.removeItem('anicatalog_keep_fs')
    }
    goWatchFromQueue(navigate, nextAnime, {
      episodeId: next.episodeId,
      requestFullscreen: wasFs || prefs.autoFullscreen,
    })
  }

  if (!anime) {
    return <WatchLoading message={error || 'Загрузка…'} />
  }

  if (!episode) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 bg-black px-4 text-center">
        <p className="text-text-muted">{error || 'Серия не найдена'}</p>
        {sortedEpisodes.length > 0 && (
          <button
            type="button"
            onClick={() => goEpisode(sortedEpisodes[0], { autoPlay: true })}
            className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-bg-dark"
          >
            Смотреть серию {sortedEpisodes[0].number}
          </button>
        )}
        <Link to="/catalog" className="text-accent hover:underline">
          В каталог
        </Link>
      </div>
    )
  }

  return (
    <div className="watch-cinema h-[100dvh] w-full overflow-hidden bg-black">
      <VideoPlayer
        episode={episode}
        animeId={anime.id}
        animeTitle={anime.title}
        episodeTitle={episode.title}
        episodeNumber={episode.number}
        cover={anime.cover}
        anime={anime}
        allEpisodes={sortedEpisodes}
        onSelectEpisode={(ep) => goEpisode(ep, { autoPlay: true })}
        hasPrev={hasPrev}
        hasNext={hasNext}
        onPrev={() => goEpisode(sortedEpisodes[sortedIndex - 1])}
        onNext={() => goEpisode(sortedEpisodes[sortedIndex + 1])}
        nextEpisode={hasNext ? sortedEpisodes[sortedIndex + 1] : null}
        onPlayNext={() => hasNext && goEpisode(sortedEpisodes[sortedIndex + 1])}
        onSeriesEnded={handleSeriesEnded}
        autoPlayOnStart={autoPlayOnStart}
        requestFullscreenOnStart={requestFullscreenOnStart}
        onBack={() => navigate(animeDetailPath(anime.id))}
      />
    </div>
  )
}
