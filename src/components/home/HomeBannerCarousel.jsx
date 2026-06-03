import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchHomeBanners, mediaUrl } from '../../api'
import { HomeHeroSkeleton } from '../ui/PageLoader'
import BannerMedia from '../BannerMedia'
import { PAGE_CONTAINER } from '../../constants/layout'
import { genreLabel } from '../../constants/genres'
import { actionBtnIcon, actionBtnSecondary } from '../../constants/ui'
import AnimeActionBar from '../anime/AnimeActionBar'

const AUTO_MS = 9000
const BANNER_H = 'h-[min(520px,72vh)]'

function SlideTags({ tags, accentFirst }) {
  if (!tags?.length) return null
  return (
    <div className="mb-3 flex flex-wrap gap-1.5 sm:gap-2">
      {tags.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider sm:px-3 sm:py-1 sm:text-[11px] ${
            accentFirst && i === 0
              ? 'border border-accent/40 bg-accent/15 text-accent'
              : 'border border-white/15 bg-black/40 text-white/85'
          }`}
        >
          {typeof tag === 'string' && tag.length < 24 ? genreLabel(tag) || tag : tag}
        </span>
      ))}
    </div>
  )
}

function CustomActions({ slide }) {
  const buttons = slide.buttons || []
  if (!buttons.length) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      {buttons.map((btn) => {
        if (btn.kind === 'route' && btn.url) {
          return (
            <Link key={btn.id || btn.url} to={btn.url} className={actionBtnSecondary}>
              {btn.label || 'Перейти'}
            </Link>
          )
        }
        if (btn.kind === 'link' && btn.url) {
          const external = /^https?:\/\//i.test(btn.url)
          return (
            <a
              key={btn.id || btn.url}
              href={btn.url}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
              className={actionBtnSecondary}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {btn.label || 'Перейти'}
            </a>
          )
        }
        return null
      })}
    </div>
  )
}

function CarouselControls({ count, index, progress, onPick, onPrev, onNext }) {
  if (count < 2) return null
  return (
    <div
      className={`${PAGE_CONTAINER} pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center pb-6 pt-8`}
    >
      <div className="pointer-events-auto flex items-center gap-3">
        <button type="button" onClick={onPrev} className={actionBtnIcon} aria-label="Назад">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onPick(i)}
              className="relative h-1 w-10 overflow-hidden rounded-full bg-white/15"
              aria-label={`Слайд ${i + 1}`}
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-75 ease-linear"
                style={{
                  width:
                    i < index ? '100%' : i === index ? `${Math.round(progress * 100)}%` : '0%',
                }}
              />
            </button>
          ))}
        </div>
        <button type="button" onClick={onNext} className={actionBtnIcon} aria-label="Вперёд">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function HomeBannerCarousel({ fallbackAnime, onWatch }) {
  const [slides, setSlides] = useState([])
  const [index, setIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback((force = false) => {
    setLoading(true)
    fetchHomeBanners({ force })
      .then((list) => setSlides(Array.isArray(list) ? list : []))
      .catch(() => setSlides([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const onReload = () => load(true)
    window.addEventListener('anicatalog-reload', onReload)
    return () => window.removeEventListener('anicatalog-reload', onReload)
  }, [load])

  useEffect(() => {
    setIndex(0)
  }, [slides.length])

  useEffect(() => {
    if (slides.length < 2) return undefined
    setProgress(0)
    const start = performance.now()
    let raf = 0
    const tick = (now) => {
      const p = Math.min(1, (now - start) / AUTO_MS)
      setProgress(p)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const timeout = window.setTimeout(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, AUTO_MS)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timeout)
    }
  }, [index, slides.length])

  const go = (delta) => {
    if (!slides.length) return
    setIndex((i) => (i + delta + slides.length) % slides.length)
  }

  if (loading && !slides.length && !fallbackAnime) {
    return (
      <section className={`relative flex ${BANNER_H} items-end`}>
        <div className={`${PAGE_CONTAINER} w-full pb-8`}>
          <HomeHeroSkeleton />
        </div>
      </section>
    )
  }

  const displaySlides = slides.length
    ? slides
    : fallbackAnime
      ? [
          {
            id: 'fallback',
            type: 'anime',
            title: fallbackAnime.title,
            description: fallbackAnime.description,
            image: fallbackAnime.cover,
            tags: [
              ...(fallbackAnime.categories?.isNew ? ['Новинка'] : []),
              ...(fallbackAnime.genres?.slice(0, 2) ?? []),
            ],
            anime: fallbackAnime,
          },
        ]
      : []

  if (!displaySlides.length) {
    return (
      <section className={`relative flex ${BANNER_H} items-end bg-bg-card`}>
        <div className={PAGE_CONTAINER}>
          <p className="pb-8 text-text-muted">Добавьте слайды в админке → Главная страница</p>
        </div>
      </section>
    )
  }

  const slide = displaySlides[index]
  const kinds = new Set((slide.buttons || []).map((b) => b.kind))

  return (
    <section className={`relative ${BANNER_H} overflow-hidden`}>
      <div className="absolute inset-0">
        <BannerMedia
          key={`${slide.id}-${slide.image}`}
          src={slide.image ? mediaUrl(slide.image) : null}
          fallbackSrc={
            slide.type === 'anime' && slide.anime?.cover ? mediaUrl(slide.anime.cover) : null
          }
          alt={slide.title}
          placeholder=""
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/80 to-bg-dark/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-bg-dark/95 via-bg-dark/55 to-bg-dark/20" />

      <div className={`${PAGE_CONTAINER} relative flex ${BANNER_H} flex-col justify-end pb-20 pt-24 md:pb-24`}>
        <div className="max-w-2xl home-fade-up">
          <SlideTags tags={slide.tags} accentFirst={slide.type === 'anime'} />
          <h1 className="font-display mb-2 line-clamp-2 text-xl font-extrabold leading-tight text-white sm:mb-3 sm:text-2xl md:text-3xl lg:text-4xl">
            {slide.title}
          </h1>
          {slide.description ? (
            <p className="mb-5 line-clamp-2 max-w-xl text-xs leading-relaxed text-white/75 sm:mb-6 sm:text-sm md:line-clamp-3 md:text-base">
              {slide.description}
            </p>
          ) : (
            <div className="mb-6" />
          )}
          {slide.type === 'anime' && slide.anime ? (
            <AnimeActionBar
              anime={slide.anime}
              onWatch={onWatch}
              showWatch={!slide.buttons?.length || kinds.has('watch')}
              showDetails={!slide.buttons?.length || kinds.has('details')}
              showFavorite={kinds.has('favorite') || !slide.buttons?.length}
              showList={kinds.has('collection') || !slide.buttons?.length}
              showQueue={!slide.buttons?.length || kinds.has('queue')}
            />
          ) : (
            <CustomActions slide={slide} />
          )}
        </div>
      </div>

      <CarouselControls
        count={displaySlides.length}
        index={index}
        progress={progress}
        onPick={setIndex}
        onPrev={() => go(-1)}
        onNext={() => go(1)}
      />
    </section>
  )
}
