import { Link } from 'react-router-dom'
import { PAGE_CONTAINER } from '../constants/layout'
import { useAuth } from '../context/AuthContext'

export default function Footer() {
  const { isAuthenticated } = useAuth()
  return (
    <footer className="mt-auto border-t border-white/[0.06] bg-bg-footer">
      <div
        className={`${PAGE_CONTAINER} flex flex-col gap-8 py-10 sm:flex-row sm:items-center sm:justify-between`}
      >
        <div>
          <p className="font-display text-lg font-bold text-white">AniHex</p>
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
            © {new Date().getFullYear()} AniHex · Beyond the abyss
          </p>
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-text-muted">
          <Link to="/catalog" className="transition duration-200 hover:text-accent">
            Каталог
          </Link>
          {isAuthenticated && (
            <>
              <Link to="/favorites" className="transition duration-200 hover:text-accent">
                Избранное
              </Link>
              <Link to="/collection" className="transition duration-200 hover:text-accent">
                Коллекции
              </Link>
            </>
          )}
        </div>
      </div>
    </footer>
  )
}
