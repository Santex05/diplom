import { Link } from 'react-router-dom'
import { animeDetailPath } from '../../utils/animeNav'

export default function WatchBreadcrumbs({ anime, episode }) {
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm" aria-label="Навигация">
      <Link
        to={animeDetailPath(anime.id)}
        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold uppercase tracking-wider text-text-muted transition hover:border-accent/30 hover:text-accent"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Назад к аниме
      </Link>
      <span className="hidden text-text-muted/50 sm:inline">/</span>
      <Link to="/" className="hidden text-text-muted transition hover:text-accent sm:inline">
        Главная
      </Link>
      <span className="hidden text-text-muted/50 sm:inline">/</span>
      <Link
        to={animeDetailPath(anime.id)}
        className="hidden max-w-[12rem] truncate text-text-muted transition hover:text-accent sm:inline md:max-w-xs"
      >
        {anime.title}
      </Link>
      <span className="hidden text-text-muted/50 sm:inline">/</span>
      <span className="hidden font-medium text-accent sm:inline">
        Серия {episode.number}
      </span>
    </nav>
  )
}
