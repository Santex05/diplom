import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchAnimeById, invalidateCache } from '../api'
import { DetailPageSkeleton } from '../components/ui/PageLoader'
import { useAnime } from '../context/AnimeContext'
import { goWatchFirst } from '../utils/animeNav'
import { findAnimeById, watchPath } from '../utils/watch'
import { getCachedAnime, setCachedAnime } from '../utils/watchCache'
import { PAGE_CONTAINER } from '../constants/layout'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import AnimeDetailHero from '../components/detail/AnimeDetailHero'
import EpisodeGridCard from '../components/detail/EpisodeGridCard'
import {
  markAllEpisodesWatched,
  markEpisodeWatched,
  countWatchedEpisodes,
} from '../utils/playerStorage'
import { loadSitePrefs } from '../utils/sitePrefs'
import { useAuth } from '../context/AuthContext'
import { useQueue } from '../context/QueueContext'
import DropdownPortal from '../components/ui/DropdownPortal'

function EpToolbarIcon({ active, onClick, title, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition duration-200 ease-out ${
        active
          ? 'border-accent bg-accent text-bg-dark shadow-sm shadow-accent/25'
          : 'border-white/10 bg-bg-card/80 text-text-muted hover:border-white/20 hover:bg-white/[0.06] hover:text-white'
      } ${className}`}
    >
      {children}
    </button>
  )
}

function LoadingShell({ message }) {
  if (message === 'Загрузка…') {
    return <DetailPageSkeleton />
  }
  return (
    <div className="page-mesh flex min-h-screen flex-col bg-bg-dark text-white">
      <Navbar />
      <p className="flex-1 py-20 text-center text-text-muted">{message}</p>
      <Footer />
    </div>
  )
}

export default function AnimeDetailPage() {
  const { animeId } = useParams()
  const navigate = useNavigate()
  const { animeList } = useAnime()
  const listRef = useRef(animeList)
  listRef.current = animeList

  const [anime, setAnime] = useState(() => {
    const fromList = findAnimeById(listRef.current, animeId)
    return fromList || getCachedAnime(animeId)
  })
  const [error, setError] = useState(null)
  const [markTick, setMarkTick] = useState(0)
  const [epSearch, setEpSearch] = useState('')
  const [epSortDesc, setEpSortDesc] = useState(false)
  const [epView, setEpView] = useState('grid')
  const [bulkOpen, setBulkOpen] = useState(false)
  const bulkRef = useRef(null)
  const { user } = useAuth()
  const { addAllEpisodesToQueue } = useQueue()

  useEffect(() => {
    if (!animeId) return

    let cancelled = false
    setError(null)

    const fromList = findAnimeById(listRef.current, animeId)
    if (fromList) setAnime(fromList)

    fetchAnimeById(animeId)
      .then((data) => {
        if (cancelled) return
        setCachedAnime(animeId, data)
        setAnime(data)
        setError(null)
      })
      .catch((e) => {
        if (cancelled) return
        const fallback = findAnimeById(listRef.current, animeId) || getCachedAnime(animeId)
        if (fallback) {
          setAnime(fallback)
          setError(null)
        } else {
          setError(e.message)
        }
      })

    return () => {
      cancelled = true
    }
  }, [animeId])

  useEffect(() => {
    const onReload = () => {
      invalidateCache(`anime:${animeId}`)
      fetchAnimeById(animeId, { force: true })
        .then(setAnime)
        .catch(() => {})
    }
    window.addEventListener('anicatalog-reload', onReload)
    return () => window.removeEventListener('anicatalog-reload', onReload)
  }, [animeId])

  if (!anime) {
    return <LoadingShell message={error || 'Загрузка…'} />
  }

  const episodes = [...(anime?.episodes || [])].sort(
    (a, b) => (a.number ?? 0) - (b.number ?? 0),
  )

  const filteredEpisodes = episodes
    .filter((ep) => {
      const q = epSearch.trim().toLowerCase()
      if (!q) return true
      return (
        String(ep.number).includes(q) ||
        (ep.title || '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      const d = (a.number ?? 0) - (b.number ?? 0)
      return epSortDesc ? -d : d
    })

  const watchedCount = countWatchedEpisodes(anime.id, episodes)

  const openEpisode = (ep) => {
    const prefs = loadSitePrefs()
    navigate(watchPath(anime.id, ep.id), {
      state: { anime, autoPlay: true, requestFullscreen: prefs.autoFullscreen },
    })
  }

  const continueWatch = ({ episode }) => openEpisode(episode)

  return (
    <div className="page-mesh flex min-h-screen flex-col bg-bg-dark text-white">
      <Navbar />

      <AnimeDetailHero
        anime={anime}
        episodeCount={episodes.length}
        onWatchFromFirst={() => goWatchFirst(navigate, anime, { autoPlay: true })}
        onContinueWatch={continueWatch}
        shareUrl={typeof window !== 'undefined' ? window.location.href : ''}
      />

      <main className={`${PAGE_CONTAINER} flex-1 py-10 md:py-14`}>
        <div className="space-y-10">
          {anime.description && (
            <section className="home-fade-up">
              <h2 className="font-display mb-4 text-xl font-bold text-white">Описание</h2>
              <p className="text-sm leading-relaxed text-white/75 md:text-base">
                {anime.description}
              </p>
            </section>
          )}

          <section className="home-fade-up">
            <div className="mb-6 flex flex-col gap-4">
              <div>
                <h2 className="font-display text-xl font-bold text-white md:text-2xl">Эпизоды</h2>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-text-muted">
                  Просмотрено {watchedCount} из {episodes.length}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="search"
                  value={epSearch}
                  onChange={(e) => setEpSearch(e.target.value)}
                  placeholder="Введите название или номер…"
                  className="min-w-[200px] flex-1 rounded-xl border border-white/10 bg-bg-card/80 px-3 py-2 text-sm text-white placeholder:text-text-muted focus:border-accent/35 focus:outline-none"
                />
                <div ref={bulkRef} className="relative">
                  <EpToolbarIcon
                    active={bulkOpen}
                    onClick={() => setBulkOpen((v) => !v)}
                    title="Действия"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                    </svg>
                  </EpToolbarIcon>
                  <DropdownPortal anchorRef={bulkRef} open={bulkOpen} align="right" className="min-w-[14rem]">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        markAllEpisodesWatched(anime.id, episodes, true, { animeTitle: anime.title, cover: anime.cover })
                        setMarkTick((n) => n + 1)
                        setBulkOpen(false)
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-white/5"
                    >
                      Отметить все просмотренными
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        markAllEpisodesWatched(anime.id, episodes, false, { animeTitle: anime.title, cover: anime.cover })
                        setMarkTick((n) => n + 1)
                        setBulkOpen(false)
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-white/5"
                    >
                      Снять все отметки
                    </button>
                    {user && (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          addAllEpisodesToQueue(anime.id, episodes, { animeTitle: anime.title, cover: anime.cover })
                          setBulkOpen(false)
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-white/5"
                      >
                        Добавить все в очередь
                      </button>
                    )}
                  </DropdownPortal>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <div className="flex overflow-hidden rounded-xl border border-white/10">
                    <EpToolbarIcon
                      active={epView === 'grid'}
                      onClick={() => setEpView('grid')}
                      title="Превью"
                      className="rounded-none border-0"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                      </svg>
                    </EpToolbarIcon>
                    <EpToolbarIcon
                      active={epView === 'list'}
                      onClick={() => setEpView('list')}
                      title="Список"
                      className="rounded-none border-0 border-l border-white/10"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
                      </svg>
                    </EpToolbarIcon>
                  </div>
                  <EpToolbarIcon
                    active={epSortDesc}
                    onClick={() => setEpSortDesc((v) => !v)}
                    title={epSortDesc ? 'С конца' : 'С начала'}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </EpToolbarIcon>
                </div>
              </div>
            </div>

            {episodes.length === 0 ? (
              <p className="rounded-2xl border border-white/[0.08] bg-bg-card/50 px-5 py-8 text-sm text-text-muted">
                Серии пока не добавлены
              </p>
            ) : epView === 'list' ? (
              <div className="space-y-2" key={markTick}>
                {filteredEpisodes.map((ep) => (
                  <EpisodeGridCard
                    key={ep.id}
                    anime={anime}
                    episode={ep}
                    layout="list"
                    onClick={() => openEpisode(ep)}
                    onMarkWatched={() => {
                      markEpisodeWatched(anime.id, ep.id, true, { animeTitle: anime.title, cover: anime.cover, episodeTitle: ep.title, number: ep.number, duration: ep.durationSeconds })
                      setMarkTick((n) => n + 1)
                    }}
                    onMarkUnwatched={() => {
                      markEpisodeWatched(anime.id, ep.id, false, { animeTitle: anime.title, cover: anime.cover, episodeTitle: ep.title, number: ep.number })
                      setMarkTick((n) => n + 1)
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" key={markTick}>
                {filteredEpisodes.map((ep) => (
                  <EpisodeGridCard
                    key={ep.id}
                    anime={anime}
                    episode={ep}
                    onClick={() => openEpisode(ep)}
                    onMarkWatched={() => {
                      markEpisodeWatched(anime.id, ep.id, true, {
                        animeTitle: anime.title,
                        cover: anime.cover,
                        episodeTitle: ep.title,
                        number: ep.number,
                        duration: ep.durationSeconds,
                      })
                      setMarkTick((n) => n + 1)
                    }}
                    onMarkUnwatched={() => {
                      markEpisodeWatched(anime.id, ep.id, false, {
                        animeTitle: anime.title,
                        cover: anime.cover,
                        episodeTitle: ep.title,
                        number: ep.number,
                      })
                      setMarkTick((n) => n + 1)
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
