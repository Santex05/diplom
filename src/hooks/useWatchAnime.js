import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { fetchAnimeById } from '../api'
import { getCachedAnime, setCachedAnime } from '../utils/watchCache'

function normalizeId(value) {
  if (value == null || value === '') return ''
  try {
    return decodeURIComponent(String(value))
  } catch {
    return String(value)
  }
}

function pickInitial(animeId, location) {
  const route = location.state?.anime
  if (route && normalizeId(route.id) === animeId) return route
  return getCachedAnime(animeId)
}

/** Загрузка аниме для /watch — без подписки на AnimeContext (нет лишних ре-рендеров). */
export function useWatchAnime(animeId) {
  const location = useLocation()
  const id = normalizeId(animeId)
  const reqRef = useRef(0)

  const [anime, setAnime] = useState(() => pickInitial(id, location))
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) {
      setError('Некорректная ссылка')
      return
    }

    const req = ++reqRef.current
    setError(null)

    const initial = pickInitial(id, location)
    if (initial) {
      setAnime(initial)
      setCachedAnime(id, initial)
    }

    fetchAnimeById(id)
      .then((data) => {
        if (req !== reqRef.current) return
        setCachedAnime(id, data)
        setAnime(data)
        setError(null)
      })
      .catch(() => {
        if (req !== reqRef.current) return
        if (!getCachedAnime(id)) {
          setError(
            'Не удалось загрузить аниме. Запустите API: cd server && npm run dev',
          )
        }
      })
  }, [id])

  return { anime, error, animeId: id }
}
