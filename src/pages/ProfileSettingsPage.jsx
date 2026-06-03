import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  updateProfileApi,
  updatePasswordApi,
  deleteAccountApi,
  uploadAvatarApi,
  deleteAvatarApi,
} from '../api/userApi'
import { mediaUrl } from '../api'
import { PAGE_CONTAINER } from '../constants/layout'
import { DEFAULT_SITE_PREFS, loadSitePrefs, saveSitePrefs } from '../utils/sitePrefs'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import SettingsToggle from '../components/settings/SettingsToggle'
import {
  assertLogin,
  assertNickname,
  assertPassword,
  LOGIN_MAX,
  NICKNAME_MAX,
  PASSWORD_MAX,
} from '../../authLimits.js'
import SettingsStorageBadge from '../components/settings/SettingsStorageBadge'
import BottomToast from '../components/ui/BottomToast'
import { settingsNavActive, settingsNavInactive } from '../constants/ui'

const SIDEBAR = [
  {
    id: 'account',
    label: 'Аккаунт',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    id: 'site',
    label: 'Сайт',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
  },
]

function SettingsCard({ title, description, children, action }) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-bg-card/50 p-5 sm:p-6">
      <div className={action ? 'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between' : ''}>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-white">{title}</h3>
          {description && (
            <p className="mt-2 text-sm leading-relaxed text-text-muted">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children && <div className={action ? 'mt-5' : 'mt-4'}>{children}</div>}
    </section>
  )
}

function UpdateBtn({ onClick, children = 'Обновить' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white transition hover:border-accent/40 hover:bg-white/[0.06]"
    >
      {children}
    </button>
  )
}

export default function ProfileSettingsPage() {
  const { user, setUser, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [section, setSection] = useState('account')
  const [nickname, setNickname] = useState(user?.nickname || '')
  const [login, setLogin] = useState(user?.login || '')
  const [prefs, setPrefs] = useState(() => loadSitePrefs())
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [deletePw, setDeletePw] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    if (user?.nickname) setNickname(user.nickname)
    if (user?.login) setLogin(user.login)
  }, [user?.nickname, user?.login])

  if (!isAuthenticated) {
    return (
      <div className="page-mesh flex min-h-screen flex-col bg-bg-dark text-white">
        <Navbar />
        <main className={`${PAGE_CONTAINER} py-20 text-center`}>
          <Link to="/auth" className="text-accent hover:underline">
            Войдите в аккаунт
          </Link>
        </main>
        <Footer />
      </div>
    )
  }

  const patchPref = (key, value) => {
    const next = saveSitePrefs({ [key]: value })
    setPrefs(next)
    setMsg('Настройки сайта сохранены')
    setErr('')
  }

  const saveNick = async () => {
    setErr('')
    try {
      assertNickname(nickname)
      const data = await updateProfileApi({ nickname })
      setUser(data.user)
      setMsg('Никнейм обновлён')
    } catch (e) {
      setErr(e.message)
    }
  }

  const saveLogin = async () => {
    setErr('')
    try {
      assertLogin(login)
      const data = await updateProfileApi({ login })
      setUser(data.user)
      setMsg('Логин обновлён')
    } catch (e) {
      setErr(e.message)
    }
  }

  const savePassword = async () => {
    setErr('')
    if (pw.next !== pw.confirm) {
      setErr('Пароли не совпадают')
      return
    }
    try {
      assertPassword(pw.next, 'Новый пароль')
      await updatePasswordApi(pw.current, pw.next)
      setPw({ current: '', next: '', confirm: '' })
      setMsg('Пароль обновлён')
    } catch (e) {
      setErr(e.message)
    }
  }

  const onAvatar = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await uploadAvatarApi(file)
      setUser(data.user)
      setMsg('Аватар обновлён')
    } catch (ex) {
      setErr(ex.message)
    }
  }

  const removeAvatar = async () => {
    if (!avatarSrc) return
    if (!window.confirm('Удалить аватар?')) return
    try {
      const data = await deleteAvatarApi()
      setUser(data.user)
      setMsg('Аватар удалён')
    } catch (ex) {
      setErr(ex.message)
    }
  }

  const removeAccount = async () => {
    if (!window.confirm('Удалить аккаунт безвозвратно?')) return
    try {
      await deleteAccountApi(deletePw)
      await logout()
      navigate('/')
    } catch (e) {
      setErr(e.message)
    }
  }

  const avatarSrc = user?.avatar ? mediaUrl(user.avatar) : null
  const inputCls =
    'w-full rounded-xl border border-white/10 bg-bg-dark/80 px-4 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-accent/35 focus:outline-none'

  return (
    <div className="page-mesh flex min-h-screen flex-col bg-bg-dark text-white">
      <Navbar />
      <main className={`${PAGE_CONTAINER} flex-1 pb-16 pt-8`}>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <aside className="w-full shrink-0 lg:w-52">
            <nav className="flex gap-1 rounded-2xl border border-white/[0.08] bg-bg-card/40 p-1.5 lg:flex-col">
              {SIDEBAR.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSection(item.id)
                    setMsg('')
                    setErr('')
                  }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition lg:justify-start ${
                    section === item.id ? settingsNavActive : settingsNavInactive
                  }`}
                >
                  <span className={section === item.id ? 'text-accent' : ''}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="min-w-0 flex-1 space-y-8">
            {section === 'account' && (
              <>
                <header>
                  <h1 className="font-display text-2xl font-bold">Настройки профиля</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
                    В этом разделе настроек вы можете изменить то, как ваш профиль выглядит для
                    других пользователей. Будьте внимательны, т.к. некоторые изменения могут нести
                    необратимый характер.
                  </p>
                </header>

                <SettingsCard
                  title="Никнейм"
                  description="Изменить ваш никнейм. Ваш никнейм будет виден другим пользователям."
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      maxLength={NICKNAME_MAX}
                      className={`${inputCls} sm:flex-1`}
                    />
                    <UpdateBtn onClick={saveNick} />
                  </div>
                </SettingsCard>

                <SettingsCard
                  title="Аватар"
                  description="Изменить ваш аватар. Ваш аватар будет виден другим пользователям."
                >
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="h-20 w-20 overflow-hidden rounded-xl border border-white/10 bg-bg-dark">
                      {avatarSrc ? (
                        <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-2xl text-accent">
                          {user.nickname?.[0]?.toUpperCase() || 'A'}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-sm hover:border-accent/40"
                      >
                        Выбрать изображение
                      </button>
                      {avatarSrc && (
                        <button
                          type="button"
                          onClick={removeAvatar}
                          className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-sm text-text-muted hover:border-red-400/40 hover:text-red-300"
                        >
                          Удалить
                        </button>
                      )}
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={onAvatar}
                      />
                    </div>
                  </div>
                </SettingsCard>

                <header className="pt-2">
                  <h2 className="font-display text-2xl font-bold">Настройки аккаунта</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
                    В этом разделе настроек вы можете изменить данные вашего аккаунта. Будьте
                    внимательны, т.к. некоторые изменения могут нести необратимый характер.
                  </p>
                </header>

                <SettingsCard
                  title="Логин"
                  description="Изменить ваш логин. Ваш логин не отображается другим пользователям и используется для авторизации в вашей учетной записи."
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                      maxLength={LOGIN_MAX}
                      className={`${inputCls} sm:flex-1`}
                    />
                    <UpdateBtn onClick={saveLogin} />
                  </div>
                </SettingsCard>

                <SettingsCard
                  title="Пароль"
                  description="Изменить ваш пароль. Будьте внимательны при изменении пароля. Если у вас не было пароля, то оставьте поле с текущим паролем пустым."
                >
                  <div className="max-w-md space-y-3">
                    <input
                      type="password"
                      placeholder="Текущий пароль"
                      value={pw.current}
                      onChange={(e) => setPw({ ...pw, current: e.target.value })}
                      maxLength={PASSWORD_MAX}
                      className={inputCls}
                    />
                    <input
                      type="password"
                      placeholder="Новый пароль"
                      value={pw.next}
                      onChange={(e) => setPw({ ...pw, next: e.target.value })}
                      maxLength={PASSWORD_MAX}
                      className={inputCls}
                    />
                    <input
                      type="password"
                      placeholder="Подтверждение пароля"
                      value={pw.confirm}
                      onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                      maxLength={PASSWORD_MAX}
                      className={inputCls}
                    />
                    <UpdateBtn onClick={savePassword}>Обновить пароль</UpdateBtn>
                  </div>
                </SettingsCard>

                <header className="pt-2">
                  <h2 className="font-display text-xl font-bold">Действия с аккаунтом</h2>
                  <p className="mt-2 text-sm text-text-muted">
                    В данном разделе можно управлять аккаунтом. Опасная зона! Будьте внимательны,
                    некоторые действия могут нести необратимый характер.
                  </p>
                </header>

                <SettingsCard
                  title="Удаление аккаунта"
                  description="Как только вы удалите свою учетную запись, пути назад не будет. Пожалуйста, будьте уверены в своем решении."
                  action={
                    <button
                      type="button"
                      onClick={removeAccount}
                      className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
                    >
                      Удалить аккаунт
                    </button>
                  }
                >
                  <input
                    type="password"
                    placeholder="Пароль для подтверждения"
                    value={deletePw}
                    onChange={(e) => setDeletePw(e.target.value)}
                    maxLength={PASSWORD_MAX}
                    className={`${inputCls} max-w-sm`}
                  />
                </SettingsCard>
              </>
            )}

            {section === 'site' && (
              <>
                <header>
                  <h1 className="font-display text-2xl font-bold">Opening & Ending</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
                    В этом разделе настроек вы можете изменить поведение плеера при проигрывании
                    опенингов и эндингов.
                  </p>
                  <SettingsStorageBadge className="mt-3" />
                </header>
                <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-bg-card/50 px-5">
                  <SettingsToggle
                    label="Автопропуск опенингов"
                    hint="При включении опенинги будут пропускаться автоматически. Не работает на всех релизах."
                    checked={prefs.skipOpening}
                    onChange={(v) => patchPref('skipOpening', v)}
                  />
                  <SettingsToggle
                    label="Автопропуск эндингов"
                    hint="При включении эндинги будут пропускаться автоматически. Не работает на всех релизах."
                    checked={prefs.skipEnding}
                    onChange={(v) => patchPref('skipEnding', v)}
                  />
                </section>

                <header>
                  <h2 className="font-display text-2xl font-bold">Автовоспроизведение</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
                    Настройки автоматического перехода к следующему эпизоду и полноэкранного режима.
                  </p>
                </header>
                <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-bg-card/50 px-5">
                  <SettingsToggle
                    label="Автовоспроизведение следующего эпизода"
                    hint="При включении следующий эпизод из плейлиста будет проигрываться автоматически."
                    checked={prefs.autoPlayNext}
                    onChange={(v) => patchPref('autoPlayNext', v)}
                  />
                  <SettingsToggle
                    label="Автоматический полноэкранный режим плеера"
                    hint="При включении плеер будет автоматически переходить в полноэкранный режим при старте эпизода."
                    checked={prefs.autoFullscreen}
                    onChange={(v) => patchPref('autoFullscreen', v)}
                  />
                </section>

                <header>
                  <h2 className="font-display text-2xl font-bold">Настройки шапки сайта</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
                    Здесь вы можете настроить количество кнопок в шапке сайта.
                  </p>
                </header>
                <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-bg-card/50 px-5">
                  <SettingsToggle
                    label="Случайный релиз"
                    hint="При включении в шапке сайта будет отображаться кнопка случайного релиза."
                    checked={prefs.headerRandom}
                    onChange={(v) => patchPref('headerRandom', v)}
                  />
                  <SettingsToggle
                    label="Поиск"
                    hint="При включении в шапке сайта будет отображаться кнопка поиска. Горячие клавиши также работают."
                    checked={prefs.headerSearch}
                    onChange={(v) => patchPref('headerSearch', v)}
                  />
                  <SettingsToggle
                    label="Настройки сайта"
                    hint="При включении в шапке сайта будет отображаться кнопка настроек."
                    checked={prefs.headerSettings}
                    onChange={(v) => patchPref('headerSettings', v)}
                  />
                  <SettingsToggle
                    label="Избранное пользователя"
                    hint="При включении в шапке сайта будет отображаться кнопка избранного."
                    checked={prefs.headerFavorites}
                    onChange={(v) => patchPref('headerFavorites', v)}
                  />
                  <SettingsToggle
                    label="Коллекции пользователя"
                    hint="При включении в шапке сайта будет отображаться кнопка коллекций."
                    checked={prefs.headerCollection}
                    onChange={(v) => patchPref('headerCollection', v)}
                  />
                </section>

                <button
                  type="button"
                  onClick={() => {
                    const reset = saveSitePrefs({ ...DEFAULT_SITE_PREFS })
                    setPrefs(reset)
                    setMsg('Настройки сброшены')
                  }}
                  className="text-sm text-text-muted transition hover:text-accent"
                >
                  Сбросить настройки сайта
                </button>
              </>
            )}
          </div>
        </div>
      </main>
      <BottomToast
        message={msg || (err ? `Ошибка: ${err}` : '')}
        onClose={() => {
          setMsg('')
          setErr('')
        }}
      />
      <Footer />
    </div>
  )
}
