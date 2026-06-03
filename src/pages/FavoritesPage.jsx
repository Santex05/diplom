import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAnime } from '../context/AnimeContext'
import { useAuth } from '../context/AuthContext'
import { animeDetailPath, goWatchFirst } from '../utils/animeNav'
import { findAnimeById } from '../utils/watch'
import { PAGE_CONTAINER } from '../constants/layout'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import PageIntro from '../components/PageIntro'
import CatalogAnimeCard from '../components/CatalogAnimeCard'
import { CatalogSkeleton } from '../components/ui/PageLoader'

export default function FavoritesPage() {
  const navigate = useNavigate()
  const { animeList, loading, error } = useAnime()
  const { favorites, isAuthenticated } = useAuth()

  const list = useMemo(
    () => favorites.map((id) => findAnimeById(animeList, id)).filter(Boolean),
    [animeList, favorites],
  )

  if (!isAuthenticated) {
    return (
      <div className="page-mesh flex min-h-screen flex-col bg-bg-dark text-white">
        <Navbar />
        <main className={`${PAGE_CONTAINER} flex-1 py-20 text-center`}>
          <p className="text-text-muted">Войдите, чтобы видеть избранное</p>
          <Link to="/auth" className="mt-4 inline-block rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-bg-dark">
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
          title="Избранное"
          subtitle="Аниме, которые вы добавили в список"
          count={list.length}
          countLabel={list.length === 1 ? 'тайтл' : 'тайтлов'}
        />
        {loading && <CatalogSkeleton count={10} />}
        {error && <p className="text-red-400">{error}</p>}
        {!loading && list.length === 0 && (
          <div className="rounded-2xl border border-white/[0.08] bg-bg-card/50 py-16 text-center text-text-muted">
            Список пуст. Нажмите «В списки» на карточке аниме
          </div>
        )}
        {!loading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-5">
          {list.map((anime, i) => (
            <CatalogAnimeCard
              key={anime.id}
              anime={anime}
              index={i}
              onClick={() => navigate(animeDetailPath(anime.id))}
              onWatch={() => goWatchFirst(navigate, anime)}
            />
          ))}
        </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
