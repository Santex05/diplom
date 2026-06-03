import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const PlayerUiContext = createContext({ playerFullscreen: false })

export function PlayerUiProvider({ children }) {
  const [playerFullscreen, setPlayerFullscreen] = useState(false)

  useEffect(() => {
    const sync = () => setPlayerFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  const value = useMemo(() => ({ playerFullscreen, setPlayerFullscreen }), [playerFullscreen])
  return <PlayerUiContext.Provider value={value}>{children}</PlayerUiContext.Provider>
}

export function usePlayerUi() {
  return useContext(PlayerUiContext)
}
