import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { fetchAnime, invalidateCache } from '../api'
import { CACHE_TTL, createCooldown, debounce, LOAD_MIN_MS } from '../utils/apiCache'
import { setCachedAnime } from '../utils/watchCache'

const RATING_RELOAD_COOLDOWN_MS = 12_000

const AnimeContext = createContext(null)

export function AnimeProvider({ children }) {
  const [animeList, setAnimeList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const ratingCooldown = useRef(createCooldown(RATING_RELOAD_COOLDOWN_MS))

  const loadAnime = useCallback(async ({ silent = false, force = false } = {}) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const data = await fetchAnime({ force })
      for (const a of data) setCachedAnime(a.id, a)
      setAnimeList(data)
    } catch (e) {
      setError(e.message)
      if (!silent) setAnimeList([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAnime()
  }, [loadAnime])

  useEffect(() => {
    const onAdminReload = () => {
      invalidateCache('catalog')
      invalidateCache('anime')
      invalidateCache('banners')
      loadAnime({ silent: true, force: true })
    }

    const onRating = debounce(() => {
      ratingCooldown.current.tryRun(() => loadAnime({ silent: true }))
    }, 1500)

    window.addEventListener('anicatalog-reload', onAdminReload)
    window.addEventListener('anicatalog-rating', onRating)
    return () => {
      window.removeEventListener('anicatalog-reload', onAdminReload)
      window.removeEventListener('anicatalog-rating', onRating)
    }
  }, [loadAnime])

  const reload = useCallback(() => {
    invalidateCache('catalog')
    return loadAnime({ silent: false, force: true })
  }, [loadAnime])

  const value = useMemo(
    () => ({
      animeList,
      loading,
      error,
      reload,
      cacheTtlSec: Math.round(CACHE_TTL.catalog / 1000),
      loadMinMs: LOAD_MIN_MS,
    }),
    [animeList, loading, error, reload],
  )

  return <AnimeContext.Provider value={value}>{children}</AnimeContext.Provider>
}

export function useAnime() {
  const ctx = useContext(AnimeContext)
  if (!ctx) throw new Error('useAnime must be used within AnimeProvider')
  return ctx
}
