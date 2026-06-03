import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAnime } from '../context/AnimeContext'
import { useSearch } from '../context/SearchContext'
import AnimePoster from './AnimePoster'
import { animeTypeLabel, resolveAnimeType } from '../constants/animeMeta'
import { animeDetailPath } from '../utils/animeNav'

export default function SearchOverlay() {
  const { open, closeSearch } = useSearch()
  const { animeList } = useAnime()
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (open) {
      setQ('')
      window.setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return []
    return animeList
      .filter((a) => a.title?.toLowerCase().includes(needle))
      .slice(0, 20)
  }, [animeList, q])

  if (!open) return null

  const pick = (id) => {
    closeSearch()
    navigate(animeDetailPath(id))
  }

  return (
    <div
      className="fixed inset-0 z-[9500] flex flex-col items-center bg-black/80 px-4 pt-[8vh] backdrop-blur-md"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeSearch()
      }}
    >
      <div className="relative w-full max-w-2xl">
        <button
          type="button"
          onClick={closeSearch}
          className="absolute -right-1 -top-11 flex h-9 w-9 items-center justify-center rounded-full text-2xl text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label="Закрыть"
        >
          ×
        </button>

        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14141a] shadow-2xl shadow-black/50">
          <div className="border-b border-white/[0.06] p-4">
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск по каталогу…"
              className="w-full rounded-xl border border-white/[0.08] bg-[#0c0c10] px-4 py-3.5 text-base text-white placeholder:text-text-muted focus:border-accent/35 focus:outline-none"
            />
          </div>

          <div className="catalog-scroll max-h-[min(52vh,480px)] overflow-y-auto">
            {!q.trim() ? (
              <div className="px-4 py-14 text-center text-text-muted">
                <p className="text-sm text-white/80">Начните вводить название</p>
                <p className="mt-1 text-xs">Результаты появятся ниже</p>
              </div>
            ) : results.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-text-muted">Ничего не найдено</p>
            ) : (
              <ul>
                {results.map((a, i) => {
                  const meta = [a.year, animeTypeLabel(resolveAnimeType(a))].filter(Boolean).join(' • ')
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => pick(a.id)}
                        className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition hover:bg-white/[0.04]"
                      >
                        <AnimePoster
                          cover={a.cover}
                          alt=""
                          className="h-14 w-10 shrink-0 rounded-lg border border-white/[0.06]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{a.title}</p>
                          {meta && (
                            <p className="mt-0.5 text-xs text-text-muted">{meta}</p>
                          )}
                        </div>
                      </button>
                      {i < results.length - 1 && (
                        <div className="mx-4 border-b border-white/[0.05]" />
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      <p className="mt-8 max-w-md text-center text-xs leading-relaxed text-white/45">
        Данное поисковое окно можно вызывать в любое время клавишей{' '}
        <kbd className="mx-0.5 rounded-md border border-white/15 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-white/70">
          /
        </kbd>
        <br />
        Чтобы закрыть поиск, нажмите{' '}
        <kbd className="mx-0.5 rounded-md border border-white/15 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-white/70">
          Esc
        </kbd>
      </p>
    </div>
  )
}
