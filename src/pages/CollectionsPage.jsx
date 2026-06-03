import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAnime } from '../context/AnimeContext'
import { useAuth } from '../context/AuthContext'
import { fetchCollection, clearCollectionApi } from '../api/userApi'
import { minDelay } from '../utils/minDelay'
import { CatalogSkeleton } from '../components/ui/PageLoader'
import { COLLECTION_TABS } from '../constants/collection'
import { PAGE_CONTAINER } from '../constants/layout'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import PageIntro from '../components/PageIntro'
import HistoryAnimeGroupCard from '../components/history/HistoryAnimeGroupCard'
import { findAnimeById } from '../utils/watch'
import { clearWatchHistory } from '../utils/playerStorage'

export default function CollectionsPage() {
  const { animeList, loading: catalogLoading } = useAnime()
  const { user, isAuthenticated, refreshCollection } = useAuth()
  const [items, setItems] = useState([])
  const [tab, setTab] = useState('planned')
  const [loading, setLoading] = useState(true)
  const [confirmClear, setConfirmClear] = useState(false)

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await minDelay(500, fetchCollection())
      setItems(data)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    load()
    const onUpdate = () => load()
    window.addEventListener('anicatalog-collection', onUpdate)
    return () => window.removeEventListener('anicatalog-collection', onUpdate)
  }, [load, user])

  const filtered = useMemo(
    () => items.filter((g) => g.status === tab),
    [items, tab],
  )

  const counts = useMemo(() => {
    const c = Object.fromEntries(COLLECTION_TABS.map((t) => [t.id, 0]))
    for (const item of items) {
      if (c[item.status] != null) c[item.status]++
    }
    return c
  }, [items])

  const enrichedGroups = useMemo(
    () =>
      filtered.map((group) => {
        const meta = findAnimeById(animeList, group.animeId)
        return {
          animeId: group.animeId,
          animeTitle: group.animeTitle || meta?.title || 'Без названия',
          cover: group.cover || meta?.cover,
          lastWatchedAt: group.updatedAt,
          episodes: group.episodes.map((ep) => ({
            ...ep,
            meta: meta?.episodes?.find((e) => String(e.id) === String(ep.episodeId)),
          })),
        }
      }),
    [filtered, animeList],
  )

  if (!isAuthenticated) {
    return (
      <div className="page-mesh flex min-h-screen flex-col bg-bg-dark text-white">
        <Navbar />
        <main className={`${PAGE_CONTAINER} flex-1 py-20 text-center`}>
          <p className="text-text-muted">Войдите, чтобы видеть коллекцию</p>
          <Link
            to="/auth"
            className="mt-4 inline-block rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-bg-dark"
          >
            Войти
          </Link>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="page-mesh flex min-h-screen flex-col bg-bg-dark text-white">
      <Navbar />
      <main className={`${PAGE_CONTAINER} flex-1 pb-16`}>
        <PageIntro
          title="Коллекции"
          subtitle="Здесь собрана ваша персональная библиотека аниме"
          count={items.length}
          countLabel={items.length === 1 ? 'тайтл' : 'тайтлов'}
          action={
            items.length > 0 ? (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-text-muted hover:border-red-400/40 hover:text-red-300"
              >
                Очистить
              </button>
            ) : null
          }
        />

        <div className="mb-8 flex flex-wrap gap-2 rounded-2xl border border-white/[0.08] bg-bg-card/40 p-2">
          {COLLECTION_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                tab === t.id
                  ? 'bg-accent text-bg-dark'
                  : 'text-text-muted hover:bg-white/5 hover:text-white'
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  tab === t.id ? 'bg-bg-dark/20' : 'border border-white/15'
                }`}
              >
                {counts[t.id] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {confirmClear && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-bg-card p-6">
              <h2 className="font-display text-lg font-bold">Очистить коллекцию?</h2>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setConfirmClear(false)} className="px-4 py-2 text-sm">
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await clearCollectionApi()
                    clearWatchHistory()
                    setConfirmClear(false)
                    load()
                    await refreshCollection()
                    window.dispatchEvent(new Event('anicatalog-collection'))
                    window.dispatchEvent(new Event('anicatalog-favorites'))
                  }}
                  className="rounded-xl bg-red-500/90 px-4 py-2 text-sm text-white"
                >
                  Очистить
                </button>
              </div>
            </div>
          </div>
        )}

        {(loading || catalogLoading) && <CatalogSkeleton count={6} />}

        {!loading && !catalogLoading && enrichedGroups.length === 0 && (
          <div className="rounded-2xl border border-white/[0.08] bg-bg-card/50 py-16 text-center text-text-muted">
            В этой категории пока пусто
          </div>
        )}

        {!loading && !catalogLoading && (
        <div className="space-y-4">
          {enrichedGroups.map((group) => (
            <HistoryAnimeGroupCard
              key={group.animeId}
              group={group}
              onRemoveEpisode={async () => load()}
            />
          ))}
        </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
