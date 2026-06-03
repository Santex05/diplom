import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { adminLogin, adminVerifySession, checkServerHealth } from '../../api'
import { clearAdminToken, isAdminLoggedIn, setAdminToken } from '../../utils/adminAuth'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [login, setLogin] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [serverHint, setServerHint] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(isAdminLoggedIn())

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      setCheckingSession(false)
      return undefined
    }

    let cancelled = false
    adminVerifySession()
      .then(() => {
        if (!cancelled) navigate('/admin', { replace: true })
      })
      .catch(() => {
        clearAdminToken()
        if (!cancelled) setCheckingSession(false)
      })

    return () => {
      cancelled = true
    }
  }, [navigate])

  useEffect(() => {
    checkServerHealth().then((h) => {
      if (!h.ok) {
        setServerHint('Запустите сервер: cd server && npm run dev')
      }
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token } = await adminLogin(login, password)
      setAdminToken(token)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07090f]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#c4b5fd]/30 border-t-[#c4b5fd]" />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07090f] px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(196,181,253,0.15)_0%,_transparent_60%)]" />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#141820]/90 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl"
      >
        <Link to="/" className="text-sm text-[#6b7280] hover:text-[#c4b5fd]">
          ← На сайт
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Админ-панель</h1>
        <p className="mt-2 text-sm text-[#6b7280]">
          Доступ только по учётным данным администратора. Обычный аккаунт сайта не подходит.
        </p>

        {serverHint && (
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {serverHint}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <label className="mt-6 block">
          <span className="text-sm text-[#9ca3af]">Логин</span>
          <input
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoComplete="username"
            className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b0e14] px-4 py-2.5 focus:border-[#c4b5fd]/50 focus:outline-none focus:ring-2 focus:ring-[#c4b5fd]/20"
          />
        </label>
        <label className="mt-4 block">
          <span className="text-sm text-[#9ca3af]">Пароль</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b0e14] px-4 py-2.5 focus:border-[#c4b5fd]/50 focus:outline-none focus:ring-2 focus:ring-[#c4b5fd]/20"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-[#c4b5fd] py-3 text-sm font-semibold text-[#1e1b4b] transition hover:bg-[#ddd6fe] disabled:opacity-50"
        >
          {loading ? 'Вход…' : 'Войти'}
        </button>
      </form>
    </div>
  )
}
