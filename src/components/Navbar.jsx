import { Link, NavLink, useNavigate } from 'react-router-dom'
import { PAGE_CONTAINER } from '../constants/layout'
import { useAnime } from '../context/AnimeContext'
import { useAuth } from '../context/AuthContext'
import { useSearch } from '../context/SearchContext'
import { useSitePrefs } from '../hooks/useSitePrefs'
import { animeDetailPath } from '../utils/animeNav'
import { usePlayerUi } from '../context/PlayerUiContext'
import UserMenu from './UserMenu'

const PUBLIC_NAV = [
  {
    to: '/',
    end: true,
    label: 'Главная',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/catalog',
    label: 'Каталог',
    matchCatalog: true,
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
]

function navLinkClass({ isActive }) {
  return `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition duration-200 ${
    isActive
      ? 'bg-accent/10 text-accent'
      : 'text-text-muted hover:bg-white/5 hover:text-white'
  }`
}

function IconBtn({ to, label, children, onClick }) {
  const cls =
    'flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-text-muted transition hover:border-accent/35 hover:text-accent'
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls} aria-label={label} title={label}>
        {children}
      </button>
    )
  }
  return (
    <Link to={to} className={cls} aria-label={label} title={label}>
      {children}
    </Link>
  )
}

export default function Navbar() {
  const { isAuthenticated } = useAuth()
  const { openSearch } = useSearch()
  const { prefs } = useSitePrefs()
  const { animeList } = useAnime()
  const navigate = useNavigate()
  const { playerFullscreen } = usePlayerUi()

  if (playerFullscreen) return null

  const openRandom = () => {
    if (!animeList.length) return
    const pick = animeList[Math.floor(Math.random() * animeList.length)]
    navigate(animeDetailPath(pick.id))
  }

  return (
    <header className="app-header-sticky border-b border-white/[0.06] bg-bg-dark/95 backdrop-blur-xl">
      <div className={`${PAGE_CONTAINER} flex h-[4.5rem] items-center gap-4 lg:gap-8`}>
        <Link to="/" className="group shrink-0">
          <span className="font-display text-lg font-bold tracking-tight text-white transition duration-200 ease-out group-hover:text-accent lg:text-xl">
            AniHex
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {PUBLIC_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={navLinkClass}
              isActive={
                item.matchCatalog
                  ? ({ location }) => location.pathname === '/catalog'
                  : undefined
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center justify-end gap-2">
          {prefs.headerRandom && animeList.length > 0 && (
            <IconBtn label="Случайный релиз" onClick={openRandom}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </IconBtn>
          )}
          {prefs.headerSearch && (
            <IconBtn label="Поиск" onClick={openSearch}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </IconBtn>
          )}
          {isAuthenticated && prefs.headerSettings && (
            <IconBtn to="/profile" label="Настройки">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </IconBtn>
          )}
          {isAuthenticated && prefs.headerFavorites && (
            <IconBtn to="/favorites" label="Избранное">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </IconBtn>
          )}
          {isAuthenticated && prefs.headerCollection && (
            <IconBtn to="/collection" label="Коллекции">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10" />
              </svg>
            </IconBtn>
          )}
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
