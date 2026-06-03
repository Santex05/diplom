import { useEffect, useState } from 'react'
import { getSettingsStorageMode } from '../../utils/userSettingsSync'

const LABELS = {
  account: 'Сохранено в аккаунте',
  guest: 'Сохранено на этом устройстве',
}

export default function SettingsStorageBadge({ className = '' }) {
  const [mode, setMode] = useState(() => getSettingsStorageMode())

  useEffect(() => {
    const sync = () => setMode(getSettingsStorageMode())
    window.addEventListener('anicatalog-settings-scope', sync)
    window.addEventListener('anicatalog-prefs', sync)
    return () => {
      window.removeEventListener('anicatalog-settings-scope', sync)
      window.removeEventListener('anicatalog-prefs', sync)
    }
  }, [])

  return (
    <p
      className={`text-xs text-white/45 ${className}`}
      title={
        mode === 'account'
          ? 'Настройки синхронизируются с вашим аккаунтом на сервере'
          : 'Настройки хранятся только в браузере этого устройства'
      }
    >
      {LABELS[mode]}
    </p>
  )
}
