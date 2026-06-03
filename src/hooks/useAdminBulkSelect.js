import { useCallback, useEffect, useMemo, useState } from 'react'

/**
 * Выделение элементов в админ-списках (удаление пачкой).
 */
export function useAdminBulkSelect(items, getId = (item) => item.id) {
  const [selected, setSelected] = useState(() => new Set())

  const ids = useMemo(() => items.map((item) => getId(item)), [items, getId])

  useEffect(() => {
    setSelected((prev) => {
      const allowed = new Set(ids)
      const next = new Set()
      for (const id of prev) {
        if (allowed.has(id)) next.add(id)
      }
      return next.size === prev.size ? prev : next
    })
  }, [ids])

  const toggle = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelected(new Set(ids))
  }, [ids])

  const clear = useCallback(() => {
    setSelected(new Set())
  }, [])

  const isSelected = useCallback((id) => selected.has(id), [selected])

  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id))
  const count = selected.size

  return {
    selected,
    selectedIds: useMemo(() => [...selected], [selected]),
    toggle,
    selectAll,
    clear,
    isSelected,
    allSelected,
    count,
    total: ids.length,
  }
}
