import { useNavigate } from 'react-router-dom'
import { PAGE_CONTAINER } from '../constants/layout'
import { genreLabel } from '../constants/genres'
import AnimePoster from './AnimePoster'
import WatchQueueButton from './WatchQueueButton'
import { animeDetailPath } from '../utils/animeNav'

export default function Hero({ anime, onWatch }) {
  const navigate = useNavigate()

  if (!anime) {
    return (
      <section className="relative flex min-h-[420px] items-end bg-bg-card py-16">
        <div className={PAGE_CONTAINER}>
          <p className="text-text-muted">Добавьте аниме в админ-панели</p>
        </div>
      </section>
    )
  }

  const isNew = anime.categories?.isNew ?? false
  const tags = [
    ...(isNew ? [{ label: 'Новинка', accent: true }] : []),
    ...(anime.genres?.slice(0, 2).map((g) => ({ label: genreLabel(g), accent: false })) ?? []),
  ]

  return (
    <section className="relative min-h-[min(88vh,720px)] overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <AnimePoster
          cover={anime.cover}
          alt=""
          className="hero-ken-burns h-full w-full"
          imgClassName="h-full w-full object-cover object-center"
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/70 to-bg-dark/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-bg-dark/95 via-bg-dark/50 to-transparent" />
      <div className="hero-glow-pulse pointer-events-none absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-accent/25 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-violet-900/30 blur-[120px]" />

      <div
        className={`${PAGE_CONTAINER} relative flex min-h-[min(88vh,720px)] flex-col justify-end pb-14 pt-32 md:pb-20 md:pt-36`}
      >
        <div className="max-w-2xl home-fade-up">
          {tags.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag.label}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                    tag.accent
                      ? 'border border-accent/40 bg-accent/15 text-accent'
                      : 'border border-white/15 bg-white/5 text-white/85'
                  }`}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}

          <h1 className="font-display mb-4 text-4xl font-extrabold leading-[1.05] tracking-tight text-white md:text-6xl lg:text-7xl">
            {anime.title}
          </h1>

          {anime.description ? (
            <p className="mb-8 line-clamp-3 max-w-xl text-sm leading-relaxed text-white/75 md:text-base md:leading-relaxed">
              {anime.description}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onWatch?.(anime)}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-bg-dark shadow-lg shadow-accent/30 transition duration-200 hover:bg-accent-btn hover:shadow-accent/45"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Смотреть
            </button>
            <button
              type="button"
              onClick={() => navigate(animeDetailPath(anime.id))}
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 py-3 text-sm font-medium text-white backdrop-blur-sm transition hover:border-white/40 hover:bg-white/10"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Подробнее
            </button>
            <WatchQueueButton animeId={anime.id} animeTitle={anime.title} cover={anime.cover} />
          </div>
        </div>
      </div>
    </section>
  )
}
