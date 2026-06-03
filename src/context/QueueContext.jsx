import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAnime } from './AnimeContext'
import { findAnimeById, firstEpisodeId } from '../utils/watch'
import {
  loadPlaybackQueue,
  queueEntryId,
  savePlaybackQueue,
} from '../utils/playbackQueue'

const QueueContext = createContext(null)

function buildItem(anime, meta = {}) {
  const epId = meta.episodeId || firstEpisodeId(anime)
  const ep = anime.episodes?.find((e) => String(e.id) === String(epId))
  return {
    id: queueEntryId(anime.id, epId),
    animeId: String(anime.id),
    animeTitle: meta.animeTitle || anime.title,
    cover: meta.cover || anime.cover,
    episodeId: epId,
    episodeNumber: ep?.number ?? meta.number ?? 1,
    episodeTitle: ep?.title || meta.episodeTitle || `Серия ${ep?.number ?? 1}`,
    durationSeconds: ep?.durationSeconds ?? meta.durationSeconds ?? 0,
  }
}

export function QueueProvider({ children }) {
  const { animeList } = useAnime()
  const [items, setItems] = useState(() => loadPlaybackQueue())

  const persist = useCallback((next) => {
    setItems(next)
    savePlaybackQueue(next)
  }, [])

  useEffect(() => {
    const sync = () => setItems(loadPlaybackQueue())
    window.addEventListener('anicatalog-queue', sync)
    window.addEventListener('anicatalog-settings-scope', sync)
    return () => {
      window.removeEventListener('anicatalog-queue', sync)
      window.removeEventListener('anicatalog-settings-scope', sync)
    }
  }, [])

  const addToQueue = useCallback(
    (animeId, meta = {}) => {
      const anime = findAnimeById(animeList, animeId)
      if (!anime) return null
      const epId = meta.episodeId || firstEpisodeId(anime)
      const id = queueEntryId(animeId, epId)
      if (items.some((i) => i.id === id)) return items.find((i) => i.id === id)
      const entry = buildItem(anime, { ...meta, episodeId: epId })
      persist([...items, entry])
      return entry
    },
    [animeList, items, persist],
  )

  const addEpisodeToQueue = useCallback(
    (animeId, episodeId, meta = {}) => {
      const anime = findAnimeById(animeList, animeId)
      if (!anime || !episodeId) return null
      const id = queueEntryId(animeId, episodeId)
      if (items.some((i) => i.id === id)) return items.find((i) => i.id === id)
      const entry = buildItem(anime, { ...meta, episodeId })
      persist([...items, entry])
      return entry
    },
    [animeList, items, persist],
  )

  const addAllEpisodesToQueue = useCallback(
    (animeId, episodes = [], meta = {}) => {
      const anime = findAnimeById(animeList, animeId)
      if (!anime) return 0
      let added = 0
      const next = [...items]
      for (const ep of episodes) {
        const id = queueEntryId(animeId, ep.id)
        if (next.some((i) => i.id === id)) continue
        next.push(buildItem(anime, { ...meta, episodeId: ep.id, episodeTitle: ep.title, number: ep.number }))
        added += 1
      }
      if (added) persist(next)
      return added
    },
    [animeList, items, persist],
  )

  const removeQueueItem = useCallback(
    (entryId) => {
      persist(items.filter((i) => i.id !== String(entryId)))
    },
    [items, persist],
  )

  const removeFromQueue = useCallback(
    (animeId, episodeId = null) => {
      const id = queueEntryId(animeId, episodeId)
      persist(items.filter((i) => i.id !== id))
    },
    [items, persist],
  )

  const toggleQueue = useCallback(
    (animeId, meta = {}) => {
      const anime = findAnimeById(animeList, animeId)
      if (!anime) return false
      const epId = meta.episodeId || firstEpisodeId(anime)
      const id = queueEntryId(animeId, epId)
      if (items.some((i) => i.id === id)) {
        removeFromQueue(animeId, epId)
        return false
      }
      addToQueue(animeId, { ...meta, episodeId: epId })
      return true
    },
    [animeList, items, addToQueue, removeFromQueue],
  )

  const toggleEpisodeQueue = useCallback(
    (animeId, episodeId, meta = {}) => {
      const id = queueEntryId(animeId, episodeId)
      if (items.some((i) => i.id === id)) {
        removeFromQueue(animeId, episodeId)
        return false
      }
      addEpisodeToQueue(animeId, episodeId, meta)
      return true
    },
    [items, addEpisodeToQueue, removeFromQueue],
  )

  const clearQueue = useCallback(() => {
    persist([])
  }, [persist])

  const isInQueue = useCallback(
    (animeId, episodeId = null) => {
      const anime = findAnimeById(animeList, animeId)
      const epId = episodeId || (anime ? firstEpisodeId(anime) : null)
      return items.some((i) => i.id === queueEntryId(animeId, epId))
    },
    [animeList, items],
  )

  const isEpisodeInQueue = useCallback(
    (animeId, episodeId) => items.some((i) => i.id === queueEntryId(animeId, episodeId)),
    [items],
  )

  const refreshItem = useCallback(
    (entryId) => {
      const item = items.find((i) => i.id === entryId)
      if (!item) return
      const anime = findAnimeById(animeList, item.animeId)
      if (!anime) return
      const idx = items.findIndex((i) => i.id === entryId)
      const next = [...items]
      next[idx] = buildItem(anime, {
        animeTitle: item.animeTitle,
        cover: item.cover,
        episodeId: item.episodeId,
      })
      persist(next)
    },
    [animeList, items, persist],
  )

  const getNextInQueue = useCallback(
    (afterEntryId) => {
      const idx = items.findIndex((i) => i.id === afterEntryId || i.animeId === String(afterEntryId))
      if (idx < 0 || idx >= items.length - 1) return null
      return items[idx + 1]
    },
    [items],
  )

  const value = useMemo(
    () => ({
      items,
      queue: items[0] ?? null,
      addToQueue,
      addEpisodeToQueue,
      addAllEpisodesToQueue,
      removeFromQueue,
      removeQueueItem,
      toggleQueue,
      toggleEpisodeQueue,
      clearQueue,
      isInQueue,
      isEpisodeInQueue,
      refreshItem,
      getNextInQueue,
    }),
    [
      items,
      addToQueue,
      addEpisodeToQueue,
      addAllEpisodesToQueue,
      removeFromQueue,
      removeQueueItem,
      toggleQueue,
      toggleEpisodeQueue,
      clearQueue,
      isInQueue,
      isEpisodeInQueue,
      refreshItem,
      getNextInQueue,
    ],
  )

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>
}

export function useQueue() {
  const ctx = useContext(QueueContext)
  if (!ctx) throw new Error('useQueue вне QueueProvider')
  return ctx
}
