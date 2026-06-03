import { useCallback, useEffect, useRef, useState } from 'react'
import {
  adminBulkDeleteUsers,
  adminDeleteUser,
  adminFetchUsers,
  adminUpdateUser,
  adminUploadUserAvatar,
  mediaUrl,
} from '../../api'
import AdminBulkToolbar from '../../components/admin/AdminBulkToolbar'
import { useAdminBulkSelect } from '../../hooks/useAdminBulkSelect'
import {
  LOGIN_MAX,
  NICKNAME_MAX,
  PASSWORD_MAX,
  PASSWORD_MIN,
} from '../../../authLimits.js'

const inputCls =
  'mt-1 w-full rounded-xl border border-white/10 bg-[#0b0e14] px-3 py-2 text-sm text-white focus:border-[#c4b5fd]/40 focus:outline-none'

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('ru-RU')
  } catch {
    return iso
  }
}

export default function AdminUsers() {
  const fileRef = useRef(null)
  const [users, setUsers] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState({ login: '', nickname: '', email: '', password: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const bulk = useAdminBulkSelect(users)
  const selected = users.find((u) => u.id === selectedId)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    adminFetchUsers()
      .then((data) => setUsers(data.users || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openUser = (user) => {
    setSelectedId(user.id)
    setForm({
      login: user.login || '',
      nickname: user.nickname || '',
      email: user.email || '',
      password: '',
    })
    setMessage('')
    setError('')
  }

  const saveUser = async () => {
    if (!selectedId) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const payload = {
        login: form.login,
        nickname: form.nickname,
        email: form.email,
      }
      if (form.password.trim()) payload.password = form.password
      const { user } = await adminUpdateUser(selectedId, payload)
      setUsers((list) => list.map((u) => (u.id === user.id ? user : u)))
      setForm((f) => ({ ...f, password: '' }))
      setMessage('Данные пользователя обновлены')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const onAvatar = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !selectedId) return
    setSaving(true)
    setError('')
    try {
      const { user } = await adminUploadUserAvatar(selectedId, file)
      setUsers((list) => list.map((u) => (u.id === user.id ? user : u)))
      setMessage('Аватар обновлён')
    } catch (ex) {
      setError(ex.message)
    } finally {
      setSaving(false)
      e.target.value = ''
    }
  }

  const onlineCount = users.filter((u) => u.isOnline).length

  const deleteSelected = async () => {
    if (bulk.count === 0) return
    const names = users
      .filter((u) => bulk.isSelected(u.id))
      .map((u) => u.nickname || u.login)
      .slice(0, 5)
    const more = bulk.count > 5 ? `\n…и ещё ${bulk.count - 5}` : ''
    if (
      !window.confirm(
        `Удалить ${bulk.count} аккаунтов?\n\n${names.join('\n')}${more}\n\nДанные пользователей будут удалены безвозвратно.`,
      )
    ) {
      return
    }

    setDeleting(true)
    setError('')
    setMessage('')
    try {
      const { deleted, failed } = await adminBulkDeleteUsers(bulk.selectedIds)
      if (selectedId && bulk.isSelected(selectedId)) {
        setSelectedId(null)
      }
      bulk.clear()
      await load()
      if (failed?.length) {
        setError(`Удалено: ${deleted.length}. Ошибки: ${failed.map((f) => f.id).join(', ')}`)
      } else {
        setMessage(`Удалено аккаунтов: ${deleted.length}`)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  const deleteOne = async () => {
    if (!selectedId || !selected) return
    if (
      !window.confirm(
        `Удалить аккаунт «${selected.nickname}» (${selected.login})?\n\nЭто действие нельзя отменить.`,
      )
    ) {
      return
    }
    setDeleting(true)
    setError('')
    setMessage('')
    try {
      await adminDeleteUser(selectedId)
      setSelectedId(null)
      bulk.clear()
      await load()
      setMessage('Аккаунт удалён')
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Пользователи</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">
            Всего: {users.length}
            {onlineCount > 0 && (
              <span className="ml-2 text-emerald-300">· на сайте сейчас: {onlineCount}</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-[#9ca3af] hover:text-white"
        >
          Обновить
        </button>
      </header>

      {message && (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-[#9ca3af]">Загрузка…</p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="space-y-3">
            <AdminBulkToolbar
              total={bulk.total}
              count={bulk.count}
              allSelected={bulk.allSelected}
              onSelectAll={bulk.selectAll}
              onClear={bulk.clear}
              onDelete={deleteSelected}
              deleting={deleting}
              itemLabel="аккаунтов"
            />

            <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-white/10 bg-[#141820] text-xs uppercase tracking-wide text-[#6b7280]">
                  <tr>
                    <th className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={bulk.allSelected}
                        onChange={() => (bulk.allSelected ? bulk.clear() : bulk.selectAll())}
                        className="h-4 w-4 rounded"
                        aria-label="Выбрать всех"
                      />
                    </th>
                    <th className="px-4 py-3">Статус</th>
                    <th className="px-4 py-3">Пользователь</th>
                    <th className="px-4 py-3">Логин</th>
                    <th className="px-4 py-3">Почта</th>
                    <th className="px-4 py-3">Просмотр</th>
                    <th className="px-4 py-3">Регистрация</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => openUser(user)}
                      className={`cursor-pointer border-b border-white/5 transition hover:bg-white/[0.03] ${
                        selectedId === user.id || bulk.isSelected(user.id)
                          ? 'bg-[#c4b5fd]/10'
                          : ''
                      }`}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={bulk.isSelected(user.id)}
                          onChange={() => bulk.toggle(user.id)}
                          className="h-4 w-4 rounded"
                          aria-label={`Выбрать ${user.nickname}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full ${
                            user.isOnline ? 'bg-emerald-400' : 'bg-[#4b5563]'
                          }`}
                          title={user.isOnline ? 'На сайте' : 'Не в сети'}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 overflow-hidden rounded-lg bg-[#0b0e14]">
                            {user.avatar ? (
                              <img
                                src={mediaUrl(user.avatar)}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="flex h-full items-center justify-center text-xs text-[#c4b5fd]">
                                {user.nickname?.[0]?.toUpperCase() || '?'}
                              </span>
                            )}
                          </div>
                          <span className="font-medium text-white">{user.nickname}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#9ca3af]">{user.login}</td>
                      <td className="max-w-[140px] truncate px-4 py-3 text-[#9ca3af]">
                        {user.email}
                      </td>
                      <td className="px-4 py-3 text-[#9ca3af]">
                        {user.watch?.animeInCollection ?? 0} аниме ·{' '}
                        {user.watch?.episodesCompleted ?? 0} серий
                      </td>
                      <td className="px-4 py-3 text-xs text-[#6b7280]">
                        {formatDate(user.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!users.length && (
              <p className="py-12 text-center text-[#9ca3af]">Пользователей пока нет</p>
            )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#141820]/60 p-5">
            {!selected ? (
              <p className="text-sm text-[#9ca3af]">Выберите пользователя в таблице</p>
            ) : (
              <div className="space-y-4">
                <h2 className="text-lg font-bold">{selected.nickname}</h2>

                <dl className="space-y-2 text-xs text-[#9ca3af]">
                  <div className="flex justify-between gap-2">
                    <dt>ID</dt>
                    <dd className="truncate text-right text-white">{selected.id}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Номер</dt>
                    <dd className="text-white">#{selected.displayId}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Последняя активность</dt>
                    <dd className="text-right text-white">{formatDate(selected.lastSeenAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Избранное</dt>
                    <dd className="text-white">{selected.favoritesCount} аниме</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Оценки</dt>
                    <dd className="text-white">{selected.ratingsCount}</dd>
                  </div>
                </dl>

                <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/90">
                  {selected.passwordNote}
                </p>

                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 overflow-hidden rounded-xl border border-white/10 bg-[#0b0e14]">
                    {selected.avatar ? (
                      <img
                        src={mediaUrl(selected.avatar)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-xl text-[#c4b5fd]">
                        {selected.nickname?.[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:border-[#c4b5fd]/40"
                  >
                    Сменить аватар
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatar} />
                </div>

                <label className="block text-xs text-[#9ca3af]">
                  Никнейм
                  <input
                    value={form.nickname}
                    onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                    maxLength={NICKNAME_MAX}
                    className={inputCls}
                  />
                </label>
                <label className="block text-xs text-[#9ca3af]">
                  Логин
                  <input
                    value={form.login}
                    onChange={(e) => setForm({ ...form, login: e.target.value })}
                    maxLength={LOGIN_MAX}
                    className={inputCls}
                  />
                </label>
                <label className="block text-xs text-[#9ca3af]">
                  Почта
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={inputCls}
                  />
                </label>
                <label className="block text-xs text-[#9ca3af]">
                  Новый пароль
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    maxLength={PASSWORD_MAX}
                    placeholder={`${PASSWORD_MIN}–${PASSWORD_MAX} символов`}
                    className={inputCls}
                  />
                </label>

                <button
                  type="button"
                  disabled={saving || deleting}
                  onClick={saveUser}
                  className="w-full rounded-xl bg-[#c4b5fd] py-2.5 text-sm font-semibold text-[#1e1b4b] disabled:opacity-50"
                >
                  Сохранить изменения
                </button>

                <button
                  type="button"
                  disabled={saving || deleting}
                  onClick={deleteOne}
                  className="w-full rounded-xl border border-red-500/40 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                >
                  Удалить аккаунт
                </button>

                {selected.ratings?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                      Оценки
                    </p>
                    <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-[#9ca3af]">
                      {selected.ratings.map((r) => (
                        <li key={r.animeId}>
                          {r.animeId} — <span className="text-[#c4b5fd]">{r.score}/10</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selected.watch?.animeList?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                      История просмотра
                    </p>
                    <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-[#9ca3af]">
                      {selected.watch.animeList.map((a) => (
                        <li key={a.animeId}>
                          <span className="text-white">{a.title}</span> — {a.episodesCompleted}/
                          {a.episodesTotal} серий
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
