import { useEffect, useState } from 'react'
import { DEFAULT_SITE_PREFS, loadSitePrefs } from '../utils/sitePrefs'

export function useSitePrefs() {
  const [prefs, setPrefs] = useState(() => loadSitePrefs())

  useEffect(() => {
    const sync = () => setPrefs(loadSitePrefs())
    window.addEventListener('anicatalog-prefs', sync)
    return () => window.removeEventListener('anicatalog-prefs', sync)
  }, [])

  return { prefs, defaults: DEFAULT_SITE_PREFS }
}
