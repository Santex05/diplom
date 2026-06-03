import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminBulkDeleteAnime, adminFetchAnime } from '../../api'
import AdminBulkToolbar from '../../components/admin/AdminBulkToolbar'
import { useAdminBulkSelect } from '../../hooks/useAdminBulkSelect'
import { formatGenresList } from '../../constants/genres'

export default function AdminDashboard() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const bulk = useAdminBulkSelect(list)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    adminFetchAnime()
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const deleteSelected = async () => {
    if (bulk.count === 0) return
    const titles = list
      .filter((a) => bulk.isSelected(a.id))
      .map((a) => a.title)
      .slice(0, 5)
    const more = bulk.count > 5 ? `\n…и ещё ${bulk.count - 5}` : ''
    if (
      !window.confirm(
        `Удалить ${bulk.count} аниме из библиотеки?\n\n${titles.join('\n')}${more}\n\nЭто действие нельзя отменить.`,
      )
    ) {
      return
    }

    setDeleting(true)
    setError('')
    setMessage('')
    try {
      const { deleted, failed } = await adminBulkDeleteAnime(bulk.selectedIds)
      bulk.clear()
      await load()
      if (failed?.length) {
        setError(`Удалено: ${deleted.length}. Ошибки: ${failed.map((f) => f.id).join(', ')}`)
      } else {
        setMessage(`Удалено аниме: ${deleted.length}`)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Каталог аниме</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            {list.length} {list.length === 1 ? 'запись' : 'записей'} в библиотеке
          </p>
        </div>
        <Link
          to="/admin/anime/new"
          className="rounded-xl bg-[#c4b5fd] px-5 py-2.5 text-sm font-semibold text-[#1e1b4b] shadow-lg shadow-[#c4b5fd]/20 transition hover:bg-[#ddd6fe]"
        >
          + Добавить аниме
        </Link>
      </div>

      {message && (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </p>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#c4b5fd] border-t-transparent" />
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
          {error.includes('Сессия') && (
            <>
              {' '}
              <Link to="/admin/login" className="underline">
                Войти снова
              </Link>
            </>
          )}
        </p>
      )}

      {!loading && !error && (
        <>
          <AdminBulkToolbar
            total={bulk.total}
            count={bulk.count}
            allSelected={bulk.allSelected}
            onSelectAll={bulk.selectAll}
            onClear={bulk.clear}
            onDelete={deleteSelected}
            deleting={deleting}
            itemLabel="аниме"
          />

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#141820]/60">
            {list.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-[#9ca3af]">Пока нет аниме</p>
                <Link
                  to="/admin/anime/new"
                  className="mt-4 inline-block text-[#c4b5fd] hover:underline"
                >
                  Добавить первое →
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-[#0b0e14]/50 text-[#9ca3af]">
                      <th className="w-10 px-3 py-3">
                        <input
                          type="checkbox"
                          checked={bulk.allSelected}
                          onChange={() => (bulk.allSelected ? bulk.clear() : bulk.selectAll())}
                          className="h-4 w-4 rounded"
                          aria-label="Выбрать все"
                        />
                      </th>
                      <th className="px-5 py-3 font-medium">Название</th>
                      <th className="px-5 py-3 font-medium">Год</th>
                      <th className="px-5 py-3 font-medium">Серий</th>
                      <th className="px-5 py-3 font-medium">Жанры</th>
                      <th className="px-5 py-3 font-medium">Метки</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((a) => (
                      <tr
                        key={a.id}
                        className={`border-b border-white/5 transition hover:bg-white/[0.02] ${
                          bulk.isSelected(a.id) ? 'bg-[#c4b5fd]/8' : ''
                        }`}
                      >
                        <td className="px-3 py-4">
                          <input
                            type="checkbox"
                            checked={bulk.isSelected(a.id)}
                            onChange={() => bulk.toggle(a.id)}
                            className="h-4 w-4 rounded"
                            aria-label={`Выбрать ${a.title}`}
                          />
                        </td>
                        <td className="px-5 py-4 font-medium text-white">{a.title}</td>
                        <td className="px-5 py-4 text-[#9ca3af]">{a.year ?? '—'}</td>
                        <td className="px-5 py-4">{a.episodeCount ?? a.episodes?.length ?? 0}</td>
                        <td className="max-w-[180px] truncate px-5 py-4 text-xs text-[#9ca3af]">
                          {formatGenresList(a.genres, 3, ', ') || '—'}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1">
                            {a.categories?.isNew && (
                              <span className="rounded-md bg-[#c4b5fd]/20 px-2 py-0.5 text-xs text-[#c4b5fd]">
                                Нов
                              </span>
                            )}
                            {a.categories?.isPopular && (
                              <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200">
                                Поп
                              </span>
                            )}
                            {a.categories?.isRecommended && (
                              <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">
                                Рек
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            to={`/admin/anime/${encodeURIComponent(a.id)}`}
                            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#c4b5fd] transition hover:border-[#c4b5fd]/40"
                          >
                            Изменить
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
