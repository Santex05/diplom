export default function PlayerSpeedToast({ rate, onReset }) {
  if (!rate || rate === 1) return null

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-20 z-[30] flex justify-center px-4">
      <button
        type="button"
        onClick={onReset}
        className="pointer-events-auto rounded-xl border border-white/15 bg-bg-card/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-md transition hover:border-accent/40 hover:text-accent"
      >
        Скорость {rate}x · сбросить
      </button>
    </div>
  )
}
