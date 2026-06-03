import { useMemo, useState } from 'react'
import { loadProgress } from '../../utils/playerStorage'
import { markAllEpisodesWatched, markEpisodeWatched } from '../../utils/playerStorage'

export default function PlayerEpisodesPanel({
  anime,
  episodes,
  currentEpisodeId,
  onSelect,
  onClose,
  fullscreen = false,
}) {
  const [q, setQ] = useState('')
  const [sortDesc, setSortDesc] = useState(false)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let list = [...episodes]
    list.sort((a, b) => (sortDesc ? b.number - a.number : a.number - b.number))
    if (!needle) return list
    return list.filter(
      (ep) =>
        String(ep.number).includes(needle) ||
        ep.title?.toLowerCase().includes(needle),
    )
  }, [episodes, q, sortDesc])

  const meta = { animeTitle: anime.title, cover: anime.cover }

  return (
    <div className={`absolute inset-0 z-[40] flex ${fullscreen ? '' : 'overflow-hidden rounded-2xl'}`}>
      <aside className="flex h-full w-[min(100%,20rem)] shrink-0 flex-col border-r border-white/[0.08] bg-bg-card/98 shadow-2xl backdrop-blur-xl sm:w-80">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-4">
          <div className="min-w-0">
            <h3 className="font-display text-base font-bold text-white">Эпизоды</h3>
            <p className="mt-0.5 text-xs text-text-muted">Список эпизодов релиза</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-bg-elevated/80 text-lg leading-none text-text-muted transition hover:border-accent/30 hover:text-white"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
        <div className="flex gap-2 border-b border-white/[0.08] px-3 py-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по названию или номеру"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-bg-dark/80 px-3 py-2 text-xs text-white placeholder:text-text-muted focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20"
          />
          <button
            type="button"
            onClick={() => setSortDesc((v) => !v)}
            className="flex h-[2.125rem] w-[2.125rem] shrink-0 items-center justify-center rounded-xl border border-white/10 bg-bg-elevated/60 text-text-muted transition hover:border-accent/30 hover:text-accent"
            title={sortDesc ? 'С конца' : 'С начала'}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto catalog-scroll">
          {filtered.map((ep) => {
            const p = loadProgress(anime.id, ep.id)
            const active = String(ep.id) === String(currentEpisodeId)
            return (
              <li key={ep.id}>
                <button
                  type="button"
                  onClick={() => onSelect(ep)}
                  className={`flex w-full items-center gap-3 border-b border-white/[0.04] px-4 py-3 text-left transition hover:bg-white/[0.04] ${
                    active ? 'bg-accent/10' : ''
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                      active
                        ? 'border-accent bg-accent/20 text-accent'
                        : 'border-white/15 bg-bg-elevated/50'
                    }`}
                  >
                    {active ? (
                      <span className="h-2 w-2 rounded-full bg-accent" />
                    ) : (
                      <span className="text-[10px] font-bold tabular-nums text-text-muted">
                        {ep.number}
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${active ? 'text-accent' : 'text-white'}`}>
                      Эпизод {ep.number}
                    </p>
                    <p className="line-clamp-1 text-xs text-text-muted">{ep.title}</p>
                  </div>
                  {p?.completed && !active && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-accent/80" title="Просмотрено" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
        <div className="flex gap-2 border-t border-white/[0.08] p-3">
          <button
            type="button"
            onClick={() => markAllEpisodesWatched(anime.id, episodes, true, meta)}
            className="flex-1 rounded-xl border border-white/10 bg-bg-elevated/40 py-2.5 text-xs font-medium text-text-muted transition hover:border-accent/30 hover:text-white"
          >
            Все просмотрено
          </button>
          <button
            type="button"
            onClick={() => markAllEpisodesWatched(anime.id, episodes, false, meta)}
            className="flex-1 rounded-xl border border-white/10 bg-bg-elevated/40 py-2.5 text-xs font-medium text-text-muted transition hover:border-accent/30 hover:text-white"
          >
            Снять отметки
          </button>
        </div>
      </aside>
      <button
        type="button"
        className="min-w-0 flex-1 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Закрыть список эпизодов"
      />
    </div>
  )
}
