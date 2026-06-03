const RING_SIZE = 104
const STROKE = 4
const ACCENT_RING = '#d8b4fe'
const RADIUS = (RING_SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function PlayerNextEpisodeOverlay({
  progress,
  nextEpisode,
  animeTitle,
  onPlayNow,
  onCancel,
  showSpaceHint = false,
}) {
  const hasCountdown = progress != null
  const fill = hasCountdown ? Math.min(1, Math.max(0, progress)) : 0
  const offset = CIRCUMFERENCE * (1 - fill)
  const epNumber = nextEpisode?.number
  const epTitle = nextEpisode?.title?.trim()

  return (
    <div
      className="absolute inset-0 z-[20] flex items-center justify-center px-4"
      role="dialog"
      aria-label="Следующий эпизод"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/75 to-black/90"
        aria-hidden
      />

      <div className="relative flex max-w-md flex-col items-center text-center">
        <button
          type="button"
          onClick={onPlayNow}
          className="group relative flex shrink-0 items-center justify-center outline-none"
          style={{ width: RING_SIZE, height: RING_SIZE }}
          aria-label="Смотреть следующий эпизод"
        >
          <svg
            className="absolute inset-0 -rotate-90"
            width={RING_SIZE}
            height={RING_SIZE}
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            aria-hidden
          >
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={STROKE}
            />
            {hasCountdown ? (
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={ACCENT_RING}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={offset}
              />
            ) : (
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="rgba(167, 139, 250, 0.35)"
                strokeWidth={STROKE}
              />
            )}
          </svg>

          <span className="relative flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-[0_0_40px_rgba(var(--accent-glow-rgb),0.25)] backdrop-blur-md transition group-hover:scale-105 group-hover:border-accent/50 group-hover:bg-white/15 group-active:scale-95">
            <svg className="ml-0.5 h-8 w-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>

        <div className="mt-7 w-full space-y-1.5">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-accent">
            Следующий эпизод
          </p>
          {epNumber != null && (
            <p className="font-display text-[1.65rem] font-bold leading-tight tracking-tight text-white sm:text-3xl">
              Эпизод {epNumber}
            </p>
          )}
          {epTitle ? (
            <p className="text-base font-medium leading-snug text-white/95 sm:text-lg">{epTitle}</p>
          ) : null}
          {animeTitle ? (
            <p className="pt-0.5 text-sm text-text-muted sm:text-[0.95rem]">{animeTitle}</p>
          ) : null}
        </div>

        {showSpaceHint && (
          <p className="mt-5 text-xs text-white/50">Пробел — воспроизвести следующую серию</p>
        )}

        <button
          type="button"
          onClick={onCancel}
          className="mt-4 rounded-full px-4 py-1.5 text-sm text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          Отмена
        </button>
      </div>
    </div>
  )
}
