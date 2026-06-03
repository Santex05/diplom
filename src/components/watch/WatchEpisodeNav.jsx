export default function WatchEpisodeNav({
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  currentNumber,
  total,
  progressLabel,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-bg-card/40 px-4 py-3 backdrop-blur-sm">
      <button
        type="button"
        disabled={!hasPrev}
        onClick={onPrev}
        className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/90 transition hover:border-accent/35 hover:text-accent disabled:opacity-35"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Пред. серия
      </button>

      <p className="text-center text-sm tabular-nums text-text-muted">
        <span className="font-semibold text-white">{currentNumber}</span>
        <span className="mx-1">/</span>
        {total}
        {progressLabel && (
          <span className="mt-0.5 block text-xs text-accent">{progressLabel}</span>
        )}
      </p>

      <button
        type="button"
        disabled={!hasNext}
        onClick={onNext}
        className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg-dark transition hover:bg-accent-btn disabled:opacity-35"
      >
        След. серия
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}
