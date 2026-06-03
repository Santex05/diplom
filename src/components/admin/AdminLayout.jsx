import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { adminLogout } from '../../api'

const nav = [
  { to: '/admin', label: 'Аниме', end: true, icon: '📺' },
  { to: '/admin/anime/new', label: 'Добавить аниме', icon: '➕' },
  { to: '/admin/home', label: 'Главная страница', icon: '🏠' },
  { to: '/admin/auth-page', label: 'Вход / регистрация', icon: '🔐' },
  { to: '/admin/users', label: 'Пользователи', icon: '👥' },
]

function NavLink({ item, active, onNavigate }) {
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? 'bg-[#c4b5fd]/15 text-[#ddd6fe]'
          : 'text-[#9ca3af] hover:bg-white/5 hover:text-white'
      }`}
    >
      <span className="text-base leading-none" aria-hidden>
        {item.icon}
      </span>
      {item.label}
    </Link>
  )
}

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const message = location.state?.message

  async function logout() {
    await adminLogout()
    navigate('/admin/login', { replace: true })
  }

  function isActive(item) {
    if (item.end) return location.pathname === item.to
    return location.pathname.startsWith(item.to)
  }

  return (
    <div className="min-h-screen bg-[#07090f] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(196,181,253,0.12)_0%,_transparent_55%)]" />

      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-white/10 bg-[#0b0e14]/90 backdrop-blur-xl lg:flex">
          <div className="border-b border-white/10 px-4 py-5">
            <Link to="/" className="text-lg font-bold tracking-tight text-white">
              AniHex
            </Link>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#c4b5fd]">
              Панель администратора
            </p>
          </div>
          <nav className="flex flex-1 flex-col gap-1 p-3">
            {nav.map((item) => (
              <NavLink key={item.to} item={item} active={isActive(item)} />
            ))}
          </nav>
          <div className="space-y-1 border-t border-white/10 p-3">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#9ca3af] transition hover:bg-white/5 hover:text-white"
            >
              ← На сайт
            </Link>
            <button
              type="button"
              onClick={logout}
              className="w-full rounded-xl px-3 py-2 text-left text-sm text-[#9ca3af] transition hover:bg-red-500/10 hover:text-red-300"
            >
              Выйти
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-white/10 bg-[#0b0e14]/80 px-4 py-3 backdrop-blur-xl lg:hidden">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold">Admin</span>
              <div className="flex gap-2">
                <Link to="/" className="text-xs text-[#9ca3af]">
                  Сайт
                </Link>
                <button type="button" onClick={logout} className="text-xs text-red-300">
                  Выйти
                </button>
              </div>
            </div>
            <nav className="mt-3 flex gap-1 overflow-x-auto pb-1">
              {nav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ${
                    isActive(item)
                      ? 'bg-[#c4b5fd]/20 text-[#ddd6fe]'
                      : 'text-[#9ca3af]'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>

          {message && (
            <div className="px-4 pt-4 lg:px-8">
              <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {message}
              </p>
            </div>
          )}

          <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
