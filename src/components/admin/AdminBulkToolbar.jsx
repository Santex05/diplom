/** Панель «выбрать все» + удаление выбранных в админке */
export default function AdminBulkToolbar({
  total,
  count,
  allSelected,
  onSelectAll,
  onClear,
  onDelete,
  deleting = false,
  itemLabel = 'элементов',
}) {
  if (total === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#141820]/80 px-4 py-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-[#9ca3af]">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={() => (allSelected ? onClear() : onSelectAll())}
          className="h-4 w-4 rounded border-white/20"
        />
        <span>Выбрать все ({total})</span>
      </label>

      {count > 0 && (
        <>
          <span className="text-sm text-white">
            Выбрано: <strong className="text-[#c4b5fd]">{count}</strong>
          </span>
          <button
            type="button"
            disabled={deleting}
            onClick={onDelete}
            className="rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/25 disabled:opacity-50"
          >
            {deleting ? 'Удаление…' : `Удалить выбранные (${count})`}
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={onClear}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-[#9ca3af] hover:text-white"
          >
            Снять выделение
          </button>
        </>
      )}

      {count === 0 && (
        <span className="text-xs text-[#6b7280]">Отметьте {itemLabel} для массового удаления</span>
      )}
    </div>
  )
}
