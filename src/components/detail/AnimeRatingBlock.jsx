import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchAnimeRating, setAnimeRatingApi } from '../../api/userApi'
import StarRating from '../ui/StarRating'

export default function AnimeRatingBlock({ animeId }) {
  const { user } = useAuth()
  const [stats, setStats] = useState({ average: null, count: 0, userScore: null })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchAnimeRating(animeId).then(setStats).catch(() => {})
    const onRate = () => fetchAnimeRating(animeId).then(setStats).catch(() => {})
    window.addEventListener('anicatalog-rating', onRate)
    return () => window.removeEventListener('anicatalog-rating', onRate)
  }, [animeId])

  const pick = async (score) => {
    if (!user || busy) return
    setBusy(true)
    try {
      const next = await setAnimeRatingApi(animeId, score)
      setStats((s) => ({ ...s, average: next.average, count: next.count, userScore: next.score }))
      window.dispatchEvent(new Event('anicatalog-rating'))
    } catch (e) {
      alert(e.message || 'Не удалось сохранить оценку')
    } finally {
      setBusy(false)
    }
  }

  const displayScore = stats.average ?? 0

  return (
    <div className="mt-3 rounded-xl border border-white/[0.08] bg-bg-card/60 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
        Рейтинг аниме
      </p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-xl font-bold tabular-nums text-white">
          {stats.average != null ? stats.average.toFixed(1) : '—'}
        </span>
        <span className="text-xs text-text-muted">/ 10</span>
      </div>
      <div className="mt-1.5">
        {user ? (
          <StarRating value={displayScore} interactive onChange={pick} size="sm" />
        ) : (
          <StarRating value={displayScore} size="sm" />
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-text-muted">
        {stats.count > 0
          ? `${stats.count} ${stats.count === 1 ? 'оценка' : stats.count < 5 ? 'оценки' : 'оценок'}`
          : 'Пока нет оценок'}
      </p>
      {!user && (
        <Link to="/auth" className="mt-1 inline-block text-[11px] text-accent transition hover:underline">
          Войдите, чтобы оценить
        </Link>
      )}
    </div>
  )
}
