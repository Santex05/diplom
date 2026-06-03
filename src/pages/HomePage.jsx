import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAnime } from '../context/AnimeContext'
import { filterByCategory } from '../utils/categories'
import Navbar from '../components/Navbar'
import HomeBannerCarousel from '../components/home/HomeBannerCarousel'
import HomeSection from '../components/HomeSection'
import Footer from '../components/Footer'
import SeasonAnimeCard from '../components/home/SeasonAnimeCard'
import RecommendCard from '../components/home/RecommendCard'
import PopularNowSection from '../components/home/PopularNowSection'
import { HomeHeroSkeleton, PageSpinner, revealStaggerStyle } from '../components/ui/PageLoader'
import { animeDetailPath, goWatchFirst } from '../utils/animeNav'

function ViewAllLink({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-1.5 text-sm font-medium text-text-muted transition hover:text-accent"
    >
      Посмотреть все
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

export default function HomePage() {
  const navigate = useNavigate()
  const { animeList, loading, error } = useAnime()

  const featured = useMemo(() => {
    const popular = filterByCategory(animeList, 'popular')
    return popular[0] ?? animeList[0] ?? null
  }, [animeList])

  const newList = useMemo(
    () => filterByCategory(animeList, 'new').slice(0, 5),
    [animeList],
  )
  const popularList = useMemo(
    () => filterByCategory(animeList, 'popular').slice(0, 6),
    [animeList],
  )
  const recommendedList = useMemo(
    () => filterByCategory(animeList, 'recommended').slice(0, 12),
    [animeList],
  )

  const goCatalog = (category) => navigate(`/catalog?category=${category}`)

  const openAnime = (anime) => navigate(animeDetailPath(anime.id))
  const watchAnime = (anime) => goWatchFirst(navigate, anime)
  const watchFeatured = () => featured && watchAnime(featured)

  const seasonYear = new Date().getFullYear()

  return (
    <div className="home-page flex min-h-screen flex-col bg-bg-dark text-white">
      <Navbar />

      {error && (
        <p className="mx-auto max-w-7xl px-4 py-4 text-center text-sm text-red-400">
          {error}. Запустите сервер:{' '}
          <code className="text-accent">cd server && npm run dev</code>
        </p>
      )}

      {loading && !error ? (
        <div className="mx-auto max-w-7xl space-y-10 px-4 py-6">
          <HomeHeroSkeleton />
          <PageSpinner />
        </div>
      ) : (
        <>
          <HomeBannerCarousel fallbackAnime={featured} onWatch={watchFeatured} />

          <main className="flex-1 space-y-20 py-14 md:space-y-24 md:py-20">
        <HomeSection
          title="Новинки сезона"
          subtitle={`Коллекция ${seasonYear}`}
          action={<ViewAllLink onClick={() => goCatalog('new')} />}
        >
          {newList.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-5">
              {newList.map((anime, i) => (
                <div key={anime.id} className="content-reveal" style={revealStaggerStyle(i)}>
                  <SeasonAnimeCard
                    anime={anime}
                    index={i}
                    onClick={openAnime}
                    onWatch={watchAnime}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">Нет аниме с категорией «Новинки»</p>
          )}
        </HomeSection>

        <PopularNowSection
          popularList={popularList}
          allAnime={animeList}
          onOpen={openAnime}
          onWatch={watchAnime}
          onViewAll={() => goCatalog('popular')}
        />

        <HomeSection
          title="Может понравиться"
          subtitle="Подборка для вас"
          action={<ViewAllLink onClick={() => goCatalog('recommended')} />}
        >
          {recommendedList.length > 0 ? (
            <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 catalog-scroll snap-x snap-mandatory sm:-mx-6 sm:px-6">
              {recommendedList.map((anime, i) => (
                <RecommendCard
                  key={anime.id}
                  anime={anime}
                  index={i}
                  onClick={openAnime}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">Нет рекомендуемых аниме</p>
          )}
        </HomeSection>
          </main>
        </>
      )}

      <Footer />
    </div>
  )
}
