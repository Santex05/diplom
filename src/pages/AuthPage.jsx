import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchAuthPageConfig, mediaUrl } from '../api'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import {
  assertLogin,
  assertNickname,
  assertPassword,
  LOGIN_MAX,
  NICKNAME_MAX,
  PASSWORD_MAX,
  PASSWORD_MIN,
} from '../../authLimits.js'

const inputClass =
  'w-full rounded-xl border border-white/10 bg-bg-card/80 px-4 py-3 text-sm text-white placeholder:text-text-muted focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/25'

const DEFAULT_PROMO = {
  title: 'AniHex',
  subtitle: 'Сохраняйте избранное, коллекции и прогресс просмотра в своём профиле',
  image: null,
}

export default function AuthPage() {
  const navigate = useNavigate()
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [promo, setPromo] = useState(DEFAULT_PROMO)

  const [loginForm, setLoginForm] = useState({ login: '', password: '' })
  const [regForm, setRegForm] = useState({
    nickname: '',
    login: '',
    email: '',
    password: '',
    passwordConfirm: '',
  })

  useEffect(() => {
    fetchAuthPageConfig()
      .then((data) => {
        if (data?.title) setPromo(data)
      })
      .catch(() => {})
  }, [])

  const submitLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      assertLogin(loginForm.login)
    } catch (err) {
      setError(err.message)
      return
    }
    setLoading(true)
    try {
      await login(loginForm.login, loginForm.password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const submitRegister = async (e) => {
    e.preventDefault()
    setError('')
    try {
      assertNickname(regForm.nickname)
      assertLogin(regForm.login)
      assertPassword(regForm.password)
    } catch (err) {
      setError(err.message)
      return
    }
    if (regForm.password !== regForm.passwordConfirm) {
      setError('Пароли не совпадают')
      return
    }
    setLoading(true)
    try {
      await register(regForm)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const promoImage = promo.image ? mediaUrl(promo.image) : null

  return (
    <div className="page-mesh flex min-h-screen flex-col bg-bg-dark text-white">
      <Navbar />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-stretch justify-center gap-8 px-4 py-10 lg:flex-row lg:gap-10 lg:px-8">
        <div className="relative hidden min-h-[440px] flex-1 overflow-hidden rounded-3xl border border-white/[0.08] lg:block">
          {promoImage ? (
            <img src={promoImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-bg-card to-bg-dark" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/70 to-bg-dark/20" />
          <div className="relative flex h-full flex-col justify-end p-10">
            <p className="font-display text-3xl font-bold">{promo.title || DEFAULT_PROMO.title}</p>
            <p className="mt-2 max-w-sm text-text-muted">
              {promo.subtitle || DEFAULT_PROMO.subtitle}
            </p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[420px] lg:mx-0 lg:shrink-0">
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-bg-card/80 backdrop-blur-sm">
            <div className="flex gap-1 border-b border-white/[0.08] bg-bg-card/50 p-1.5">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
                  mode === 'login' ? 'bg-accent text-bg-dark' : 'text-text-muted hover:text-white'
                }`}
              >
                Вход
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
                  mode === 'register'
                    ? 'bg-accent text-bg-dark'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                Регистрация
              </button>
            </div>

            <div className="p-6 sm:p-8">
              <h1 className="font-display text-2xl font-bold">
                {mode === 'login' ? 'Авторизация' : 'Регистрация'}
              </h1>
              <p className="mt-2 text-sm text-text-muted">
                {mode === 'login'
                  ? 'Войдите по логину и паролю'
                  : 'Создайте аккаунт — никнейм, логин, почта и пароль'}
              </p>
              {mode === 'register' && (
                <p className="mt-1 text-xs text-text-muted/80">
                  Никнейм и логин — до {NICKNAME_MAX} символов, пароль — {PASSWORD_MIN}–
                  {PASSWORD_MAX}
                </p>
              )}

              {error && (
                <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}

              {mode === 'login' ? (
                <form onSubmit={submitLogin} className="mt-6 space-y-4" autoComplete="on">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-text-muted">Логин</span>
                    <input
                      id="auth-login"
                      name="login"
                      autoComplete="username"
                      className={inputClass}
                      placeholder="Ваш логин"
                      value={loginForm.login}
                      onChange={(e) => setLoginForm({ ...loginForm, login: e.target.value })}
                      maxLength={LOGIN_MAX}
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-text-muted">Пароль</span>
                    <input
                      id="auth-password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      className={inputClass}
                      placeholder="Пароль"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      maxLength={PASSWORD_MAX}
                      required
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-bg-dark transition hover:bg-accent-btn disabled:opacity-50"
                  >
                    {loading ? 'Вход…' : 'Войти'}
                  </button>
                </form>
              ) : (
                <form onSubmit={submitRegister} className="mt-6 space-y-4" autoComplete="on">
                  {[
                    ['nickname', 'Никнейм', 'text', NICKNAME_MAX, 'nickname'],
                    ['login', 'Логин', 'text', LOGIN_MAX, 'username'],
                    ['email', 'Почта', 'email', 254, 'email'],
                    ['password', 'Пароль', 'password', PASSWORD_MAX, 'new-password'],
                    ['passwordConfirm', 'Пароль ещё раз', 'password', PASSWORD_MAX, 'new-password'],
                  ].map(([key, label, type, maxLen, autoComplete]) => (
                    <label key={key} className="block">
                      <span className="mb-1.5 block text-xs font-medium text-text-muted">{label}</span>
                      <input
                        type={type}
                        name={key}
                        autoComplete={autoComplete}
                        className={inputClass}
                        placeholder={label}
                        value={regForm[key]}
                        onChange={(e) => setRegForm({ ...regForm, [key]: e.target.value })}
                        maxLength={maxLen}
                        required
                      />
                    </label>
                  ))}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-bg-dark transition hover:bg-accent-btn disabled:opacity-50"
                  >
                    {loading ? 'Создание…' : 'Зарегистрироваться'}
                  </button>
                </form>
              )}

              <p className="mt-6 text-center text-sm text-text-muted">
                <Link to="/" className="text-accent hover:underline">
                  На главную
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
