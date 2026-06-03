import { useEffect } from 'react'

export default function BottomToast({ message, onClose, actionLabel, onAction, duration = 5000 }) {
  useEffect(() => {
    if (!message || actionLabel) return undefined
    const t = window.setTimeout(() => onClose?.(), duration)
    return () => window.clearTimeout(t)
  }, [message, onClose, actionLabel, duration])

  if (!message) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[9000] flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-bg-card/95 px-4 py-3 shadow-2xl backdrop-blur-md">
        <p className="flex-1 text-sm text-white/90">{message}</p>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="shrink-0 rounded-lg bg-accent/20 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/30"
          >
            {actionLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-1 text-text-muted hover:text-white"
          aria-label="Закрыть"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
