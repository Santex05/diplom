const DEFAULT_GAP = 1

function clampYearRange(valueMin, valueMax, min, max, gap = DEFAULT_GAP) {
  let lo = Number(valueMin)
  let hi = Number(valueMax)
  if (!Number.isFinite(lo)) lo = min
  if (!Number.isFinite(hi)) hi = max
  lo = Math.max(min, Math.min(lo, max))
  hi = Math.max(min, Math.min(hi, max))
  if (lo > hi - gap) {
    if (hi + gap <= max) {
      hi = lo + gap
    } else {
      lo = Math.max(min, hi - gap)
    }
  }
  return [lo, hi]
}

export default function DualRangeSlider({
  min,
  max,
  valueMin,
  valueMax,
  onChange,
  minGap = DEFAULT_GAP,
  className = '',
}) {
  const [lo, hi] = clampYearRange(valueMin, valueMax, min, max, minGap)
  const span = max - min || 1
  const left = ((lo - min) / span) * 100
  const width = ((hi - lo) / span) * 100

  const setMin = (raw) => {
    const nextLo = Math.max(min, Math.min(Number(raw), hi - minGap))
    onChange(nextLo, hi)
  }

  const setMax = (raw) => {
    const nextHi = Math.min(max, Math.max(Number(raw), lo + minGap))
    onChange(lo, nextHi)
  }

  return (
    <div className={`relative h-7 px-3 ${className}`}>
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/10" />
      <div
        className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent/70"
        style={{ left: `${left}%`, width: `${width}%` }}
      />
      <input
        type="range"
        min={min}
        max={max}
        value={lo}
        onChange={(e) => setMin(e.target.value)}
        className="dual-range-thumb absolute inset-x-0 z-[2] w-full cursor-pointer appearance-none bg-transparent"
      />
      <input
        type="range"
        min={min}
        max={max}
        value={hi}
        onChange={(e) => setMax(e.target.value)}
        className="dual-range-thumb absolute inset-x-0 z-[3] w-full cursor-pointer appearance-none bg-transparent"
      />
    </div>
  )
}

export { clampYearRange }
