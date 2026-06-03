/** Кастомный ползунок: закрашенная часть + круглый thumb */
export default function PlayerRange({
  min = 0,
  max = 1,
  value = 0,
  onChange,
  variant = 'progress',
  className = '',
  disabled = false,
  'aria-label': ariaLabel,
}) {
  const safeMax = max > min ? max : min + 1
  const clamped = Math.min(safeMax, Math.max(min, value))
  const pct = ((clamped - min) / (safeMax - min)) * 100

  return (
    <input
      type="range"
      min={min}
      max={safeMax}
      step={variant === 'volume' ? 0.02 : 0.1}
      value={clamped}
      onChange={onChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`player-range player-range--${variant} ${className}`.trim()}
      style={{ '--fill': `${pct}%` }}
    />
  )
}
