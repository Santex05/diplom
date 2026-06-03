import { useEffect, useRef, useState } from 'react'
import { actionBtnIcon } from '../../constants/ui'

function formatTimestamp(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }
  return `${m}:${String(sec).padStart(2, '0')}`
}

export default function ShareMenu({ url, currentTime = 0, linkOnly = false }) {
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const close = (e) => {
      if (ref.current?.contains(e.target)) return
      setOpen(false)
    }
    const timer = window.setTimeout(() => {
      document.addEventListener('click', close, true)
    }, 0)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('click', close, true)
    }
  }, [open])

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      setToast(label)
      setOpen(false)
      window.setTimeout(() => setToast(''), 2000)
    } catch {
      setToast('Не удалось скопировать')
    }
  }

  const linkWithTime =
    currentTime > 3 ? `${url}${url.includes('?') ? '&' : '?'}t=${Math.floor(currentTime)}` : url

  if (linkOnly) {
    return (
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            copy(url, 'Ссылка скопирована')
          }}
          className={actionBtnIcon}
          aria-label="Поделиться ссылкой"
          title="Скопировать ссылку"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
        {toast && (
          <span className="pointer-events-none absolute right-0 top-full z-50 mt-2 whitespace-nowrap rounded-lg bg-bg-card px-3 py-1.5 text-xs text-accent shadow-lg">
            {toast}
          </span>
        )}
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className={actionBtnIcon}
        aria-label="Поделиться"
        aria-expanded={open}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 min-w-[14rem] overflow-hidden rounded-xl border border-white/10 bg-bg-card py-1 shadow-xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => copy(url, 'Ссылка скопирована')}
            className="block w-full px-3 py-2.5 text-left text-sm text-white/90 hover:bg-white/5"
          >
            Скопировать ссылку
          </button>
          <button
            type="button"
            onClick={() =>
              copy(
                linkWithTime,
                currentTime > 3
                  ? `Ссылка с тайм-кодом ${formatTimestamp(currentTime)}`
                  : 'Ссылка скопирована',
              )
            }
            className="block w-full px-3 py-2.5 text-left text-sm text-white/90 hover:bg-white/5"
          >
            С тайм-кодом{currentTime > 3 ? ` (${formatTimestamp(currentTime)})` : ''}
          </button>
        </div>
      )}

      {toast && (
        <span className="pointer-events-none absolute right-0 top-full z-50 mt-2 whitespace-nowrap rounded-lg bg-bg-card px-3 py-1.5 text-xs text-accent shadow-lg">
          {toast}
        </span>
      )}
    </div>
  )
}
