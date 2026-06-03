/** Полноэкранный или встроенный индикатор загрузки страницы */
export function PageSpinner({ className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 py-16 ${className}`}>
      <div className="h-11 w-11 animate-spin rounded-full border-2 border-white/15 border-t-accent" />
      <p className="text-sm text-text-muted">Загрузка…</p>
    </div>
  )
}

export function CatalogSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-2xl border border-white/5 bg-[#141820]"
        >
          <div className="aspect-[2/3] bg-white/5" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-3/4 rounded bg-white/10" />
            <div className="h-2 w-1/2 rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function HomeHeroSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-3xl border border-white/10 bg-[#141820]">
      <div className="aspect-[21/9] max-h-[420px] bg-white/5" />
    </div>
  )
}

export function DetailPageSkeleton() {
  return (
    <div className="page-mesh flex min-h-screen flex-col bg-bg-dark text-white">
      <div className="h-[var(--header-height)] border-b border-white/5 bg-bg-dark/80" />
      <div className="mx-auto w-full max-w-7xl flex-1 animate-pulse px-4 py-8">
        <div className="aspect-[21/9] max-h-[380px] rounded-3xl bg-white/5" />
        <div className="mt-8 space-y-3">
          <div className="h-8 w-2/3 rounded-lg bg-white/10" />
          <div className="h-4 w-full max-w-xl rounded bg-white/5" />
          <div className="h-4 w-5/6 max-w-lg rounded bg-white/5" />
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="aspect-video rounded-xl bg-white/5" />
          ))}
        </div>
      </div>
    </div>
  )
}

/** Плавное появление карточек после загрузки */
export function revealStaggerStyle(index, stepMs = 45, maxMs = 480) {
  const delay = Math.min(index * stepMs, maxMs)
  return {
    animationDelay: `${delay}ms`,
    animationFillMode: 'both',
  }
}
