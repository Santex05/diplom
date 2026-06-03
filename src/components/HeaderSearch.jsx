import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAnime } from '../context/AnimeContext'
import AnimePoster from './AnimePoster'
import { formatGenresList } from '../constants/genres'
import { animeDetailPath } from '../utils/animeNav'

export default function HeaderSearch() {
  const { animeList } = useAnime()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 1) return []
    return animeList
      .filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q),
      )
      .slice(0, 8)
  }, [animeList, query])

  const goAnime = (anime) => {
    navigate(animeDetailPath(anime.id))
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative w-full max-w-sm">
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
      </svg>
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        placeholder="Поиск аниме..."
        className="w-full rounded-full border border-white/10 bg-bg-card/90 py-2.5 pl-10 pr-4 text-sm text-white transition duration-200 placeholder:text-text-muted focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/25"
      />

      {open && query.trim() && (
        <ul className="absolute left-0 right-0 top-full z-[60] mt-2 max-h-80 overflow-y-auto rounded-2xl border border-white/10 bg-bg-card py-2 shadow-xl shadow-black/40">
          {results.length === 0 && (
            <li className="px-4 py-3 text-sm text-[#6b7280]">Ничего не найдено</li>
          )}
          {results.map((anime) => (
            <li key={anime.id}>
              <button
                type="button"
                onMouseDown={() => goAnime(anime)}
                className="flex w-full gap-3 px-3 py-2.5 text-left transition duration-200 hover:bg-white/5"
              >
                <AnimePoster
                  cover={anime.cover}
                  alt=""
                  className="h-14 w-10 shrink-0 rounded-md"
                  imgClassName="h-14 w-10 rounded-md object-cover object-center"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{anime.title}</p>
                  <p className="text-xs text-[#6b7280]">
                    {anime.episodeCount} серий
                    {anime.genres?.length
                      ? ` · ${formatGenresList(anime.genres, 2, ', ')}`
                      : ''}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
