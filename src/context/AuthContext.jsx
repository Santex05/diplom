import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  fetchMe,
  loginUser,
  logoutUser,
  registerUser,
  fetchFavorites,
  fetchCollection,
} from '../api/userApi'
import { getUserToken } from '../utils/userAuth'
import { syncCollectionToLocal } from '../utils/playerStorage'
import {
  activateAccountSession,
  activateGuestSession,
  flushSettingsSync,
} from '../utils/userSettingsSync'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [favorites, setFavorites] = useState([])
  const [collectionMap, setCollectionMap] = useState({})
  const [loading, setLoading] = useState(true)

  const refreshFavorites = useCallback(async () => {
    if (!getUserToken()) {
      setFavorites([])
      return
    }
    const ids = await fetchFavorites()
    setFavorites(ids.map(String))
  }, [])

  const refreshCollection = useCallback(async () => {
    if (!getUserToken()) {
      setCollectionMap({})
      return []
    }
    const items = await fetchCollection()
    const map = {}
    for (const item of items) {
      map[String(item.animeId)] = item
    }
    setCollectionMap(map)
    syncCollectionToLocal(items)
    return items
  }, [])

  const bootstrap = useCallback(async () => {
    setLoading(true)
    try {
      const me = await fetchMe()
      setUser(me)
      if (me) {
        await activateAccountSession(me.id)
        const ids = await fetchFavorites()
        setFavorites(ids.map(String))
        await refreshCollection()
      } else {
        setCollectionMap({})
        activateGuestSession()
      }
    } catch {
      setUser(null)
      setFavorites([])
      setCollectionMap({})
      activateGuestSession()
    } finally {
      setLoading(false)
    }
  }, [refreshCollection])

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  useEffect(() => {
    const onCollection = () => {
      if (getUserToken()) refreshCollection().catch(() => {})
    }
    window.addEventListener('anicatalog-collection', onCollection)
    return () => window.removeEventListener('anicatalog-collection', onCollection)
  }, [refreshCollection])

  const login = async (loginName, password) => {
    const data = await loginUser(loginName, password)
    setUser(data.user)
    await activateAccountSession(data.user.id, { snapshotGuest: true })
    await refreshFavorites()
    await refreshCollection()
    return data.user
  }

  const register = async (payload) => {
    const data = await registerUser(payload)
    setUser(data.user)
    await activateAccountSession(data.user.id, { snapshotGuest: true })
    await refreshFavorites()
    await refreshCollection()
    return data.user
  }

  const logout = async () => {
    window.dispatchEvent(new Event('anicatalog-flush-catalog-draft'))
    await flushSettingsSync()
    await logoutUser()
    activateGuestSession({ fromAccount: true })
    setUser(null)
    setFavorites([])
    setCollectionMap({})
  }

  const getCollectionEntry = useCallback(
    (animeId) => collectionMap[String(animeId)] || null,
    [collectionMap],
  )

  const value = useMemo(
    () => ({
      user,
      loading,
      favorites,
      collectionMap,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refreshFavorites,
      refreshCollection,
      getCollectionEntry,
      setUser,
      bootstrap,
    }),
    [
      user,
      loading,
      favorites,
      collectionMap,
      refreshFavorites,
      refreshCollection,
      getCollectionEntry,
      bootstrap,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth вне AuthProvider')
  return ctx
}
