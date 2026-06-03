import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const SearchContext = createContext(null)

export function SearchProvider({ children }) {
  const [open, setOpen] = useState(false)

  const openSearch = useCallback(() => setOpen(true), [])
  const closeSearch = useCallback(() => setOpen(false), [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !isEditable(e.target)) {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const value = useMemo(
    () => ({ open, setOpen, openSearch, closeSearch }),
    [open, openSearch, closeSearch],
  )

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
}

function isEditable(el) {
  if (!el || !(el instanceof HTMLElement)) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

export function useSearch() {
  const ctx = useContext(SearchContext)
  if (!ctx) throw new Error('useSearch вне SearchProvider')
  return ctx
}
