import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AnimeProvider } from './context/AnimeContext'
import { AuthProvider } from './context/AuthContext'
import { PlayerUiProvider } from './context/PlayerUiContext'
import ScrollToTop from './components/ScrollToTop'
import AdminRoute from './components/AdminRoute'
import AppShell from './components/AppShell'

const HomePage = lazy(() => import('./pages/HomePage'))
const CatalogPage = lazy(() => import('./pages/CatalogPage'))
const AnimeDetailPage = lazy(() => import('./pages/AnimeDetailPage'))
const WatchPage = lazy(() => import('./pages/WatchPage'))
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'))
const CollectionsPage = lazy(() => import('./pages/CollectionsPage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const ProfileSettingsPage = lazy(() => import('./pages/ProfileSettingsPage'))
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminAnimeForm = lazy(() => import('./pages/admin/AdminAnimeForm'))
const AdminHomeBanners = lazy(() => import('./pages/admin/AdminHomeBanners'))
const AdminAuthPage = lazy(() => import('./pages/admin/AdminAuthPage'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))

import { PageSpinner } from './components/ui/PageLoader'

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-bg-dark">
      <PageSpinner />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <AnimeProvider>
          <PlayerUiProvider>
            <AppShell>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/catalog" element={<CatalogPage />} />
                  <Route path="/anime/:animeId" element={<AnimeDetailPage />} />
                  <Route path="/watch/:animeId/:episodeId" element={<WatchPage />} />
                  <Route path="/favorites" element={<FavoritesPage />} />
                  <Route path="/collection" element={<CollectionsPage />} />
                  <Route path="/history" element={<Navigate to="/collection" replace />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/profile" element={<ProfileSettingsPage />} />

                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route element={<AdminRoute />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/home" element={<AdminHomeBanners />} />
                    <Route path="/admin/auth-page" element={<AdminAuthPage />} />
                    <Route path="/admin/users" element={<AdminUsers />} />
                    <Route path="/admin/anime/new" element={<AdminAnimeForm />} />
                    <Route path="/admin/anime/:id" element={<AdminAnimeForm />} />
                  </Route>
                </Routes>
              </Suspense>
            </AppShell>
          </PlayerUiProvider>
        </AnimeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
