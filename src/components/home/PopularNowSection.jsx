import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AnimePoster from '../AnimePoster'
import { PAGE_CONTAINER } from '../../constants/layout'
import { genreLabel } from '../../constants/genres'
import { collectGenres } from '../../utils/filterAnime'
import {
  displayRating,
  averageDisplayRating,
  totalRatingCount,
  ratingCountLabel,
} from '../../utils/displayRating'

function SectionLink({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-1.5 text-sm font-medium text-text-muted transition hover:text-accent"
    >
      {children}
      <svg
        className="h-4 w-4 transition group-hover:translate-x-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}

export default function PopularNowSection({
  popularList,
  allAnime,
  onOpen,
  onWatch,
  onViewAll,
}) {
  const navigate = useNavigate()
  const featured = popularList[0]
  const watching = popularList[1]
  const sideList = popularList.slice(2, 4)

  const topGenres = useMemo(() => {
    const keys = collectGenres(allAnime).slice(0, 4)
    return keys.length ? keys : ['Action', 'Fantasy', 'Thriller', 'Supernatural']
  }, [allAnime])

  const communityScore = averageDisplayRating(popularList)
  const reviewCount = totalRatingCount(popularList)

  const goGenre = (key) =>
    navigate(`/catalog?genres=${encodeURIComponent(key)}`)

  if (!featured) {
    return (
      <section className={`${PAGE_CONTAINER} home-fade-up`}>
        <p className="text-sm text-text-muted">Нет популярных аниме</p>
      </section>
    )
  }

  return (
    <section className={`${PAGE_CONTAINER} home-fade-up`}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white md:text-3xl">
            Популярное сейчас
          </h2>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-accent/80">
            Топ недели
          </p>
        </div>
        <SectionLink onClick={onViewAll}>Посмотреть все</SectionLink>
      </div>

      <div className="grid gap-4 lg:grid-cols-12 lg:grid-rows-[auto_auto]">
        {/* Главный хит */}
        <article className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-bg-card lg:col-span-7 lg:row-span-2 lg:min-h-[420px]">
          <AnimePoster
            cover={featured.cover}
            alt={featured.title}
            className="absolute inset-0 h-full w-full"
            imgClassName="h-full w-full object-cover object-center transition duration-700 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/55 to-[#0a0a0c]/15" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c]/90 via-transparent to-transparent" />
          <div className="relative flex h-full min-h-[320px] flex-col justify-end p-6 sm:min-h-[380px] sm:p-8">
            <span className="mb-3 inline-flex w-fit rounded-full border border-accent/30 bg-accent/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent">
              №1 в каталоге
            </span>
            <h3 className="font-display max-w-lg text-2xl font-bold text-white sm:text-4xl">
              {featured.title}
            </h3>
            {featured.description && (
              <p className="mt-3 line-clamp-3 max-w-md text-sm leading-relaxed text-white/70">
                {featured.description}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onWatch?.(featured)}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-bg-dark shadow-lg shadow-accent/25 transition hover:bg-accent-btn hover:shadow-accent/40"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Смотреть сейчас
              </button>
              <button
                type="button"
                onClick={() => onOpen?.(featured)}
                className="rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition hover:border-white/35 hover:bg-white/10"
              >
                Подробнее
              </button>
            </div>
          </div>
        </article>

        {/* Сейчас смотрят */}
        {watching && (
          <article
            role="button"
            tabIndex={0}
            onClick={() => onOpen?.(watching)}
            onKeyDown={(e) => e.key === 'Enter' && onOpen?.(watching)}
            className="group relative flex cursor-pointer overflow-hidden rounded-2xl border border-white/[0.08] bg-bg-card transition duration-300 hover:border-accent/30 lg:col-span-5"
          >
            <div className="flex flex-1 flex-col justify-center gap-2 p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400/90">
                  Сейчас смотрят
                </span>
              </div>
              <h3 className="font-display text-lg font-bold text-white transition group-hover:text-accent sm:text-xl">
                {watching.title}
              </h3>
              <p className="line-clamp-2 text-xs text-text-muted sm:text-sm">
                {watching.description || `${watching.episodeCount || 0} серий в каталоге`}
              </p>
              {displayRating(watching) != null && (
                <p className="text-xs font-medium text-accent">
                  Рейтинг {displayRating(watching)} / 10
                </p>
              )}
            </div>
            <div className="relative w-28 shrink-0 self-stretch overflow-hidden sm:w-36">
              <AnimePoster
                cover={watching.cover}
                alt=""
                className="absolute inset-0 h-full w-full"
                imgClassName="transition duration-500 group-hover:scale-105"
              />
            </div>
          </article>
        )}

        {/* Топ жанров */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-bg-card/80 p-5 backdrop-blur-sm lg:col-span-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">
              Топ жанров
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {topGenres.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => goGenre(key)}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/90 transition hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
                >
                  {genreLabel(key)}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-6 flex gap-1 opacity-40" aria-hidden>
            <span className="h-8 w-8 rounded-full border border-white/20" />
            <span className="ml-2 h-6 w-6 rotate-45 border border-accent/40" />
          </div>
        </div>

        {/* Рейтинг сообщества */}
        <div className="relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/20 via-[#1a1028] to-bg-card p-5 lg:col-span-2">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent/20 blur-2xl" />
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent/90">
            Рейтинг сообщества
          </p>
          <div className="mt-3 flex items-end gap-2">
            <span className="font-display text-4xl font-bold text-white">{communityScore}</span>
            <span className="mb-1 text-lg text-text-muted">/10</span>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            {reviewCount > 0
              ? `На основе ${reviewCount.toLocaleString('ru-RU')} ${ratingCountLabel(reviewCount)} пользователей`
              : 'Пока нет оценок в каталоге'}
          </p>
          <svg
            className="absolute bottom-4 right-4 h-10 w-10 text-accent/35"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
          </svg>
        </div>

        {/* Доп. карточки */}
        {sideList.length > 0 && (
          <div className="grid grid-cols-2 gap-3 lg:col-span-12 lg:grid-cols-2">
            {sideList.map((anime) => (
              <button
                key={anime.id}
                type="button"
                onClick={() => onOpen?.(anime)}
                className="group flex items-center gap-3 overflow-hidden rounded-2xl border border-white/[0.06] bg-bg-card/60 p-3 text-left transition hover:border-accent/25 hover:bg-bg-card"
              >
                <AnimePoster
                  cover={anime.cover}
                  alt=""
                  className="h-16 w-12 shrink-0 rounded-lg"
                  imgClassName="h-16 w-12 rounded-lg object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white group-hover:text-accent">
                    {anime.title}
                  </p>
                  {displayRating(anime) != null && (
                    <p className="text-xs text-text-muted">★ {displayRating(anime)}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
