import { useState } from 'react'

const STAR_PATH =
  'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'

const SIZES = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
}

function StarGlyph({ fill, size, className = '' }) {
  const dim = SIZES[size] || SIZES.md
  const clamped = Math.min(1, Math.max(0, fill))

  return (
    <span className={`relative inline-block shrink-0 ${dim} ${className}`}>
      <svg
        className={`${dim} text-white/20`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={STAR_PATH} />
      </svg>
      <span
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{ width: `${clamped * 100}%` }}
      >
        <svg className={`${dim} text-accent`} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d={STAR_PATH} />
        </svg>
      </span>
    </span>
  )
}

/** Рейтинг 0–maxStars с полузвёздами; при наведении — пустые звёзды для выбора оценки. */
export default function StarRating({
  value = 0,
  maxStars = 10,
  size = 'md',
  interactive = false,
  onChange,
  className = '',
}) {
  const [hover, setHover] = useState(null)
  const [hovering, setHovering] = useState(false)

  const display = hovering && interactive ? (hover ?? 0) : value

  const fillFor = (star) => Math.min(1, Math.max(0, display - (star - 1)))

  return (
    <div
      className={`flex items-center gap-0.5 ${className}`}
      onMouseEnter={() => {
        if (interactive) {
          setHovering(true)
          setHover(null)
        }
      }}
      onMouseLeave={() => {
        setHovering(false)
        setHover(null)
      }}
      role={interactive ? 'group' : undefined}
      aria-label={interactive ? 'Оценка' : undefined}
    >
      {Array.from({ length: maxStars }, (_, i) => {
        const star = i + 1
        const inner = <StarGlyph fill={fillFor(star)} size={size} />

        if (!interactive) {
          return <span key={star}>{inner}</span>
        }

        return (
          <button
            key={star}
            type="button"
            className="cursor-pointer rounded p-0.5 transition duration-200 ease-out hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            onMouseEnter={() => {
              setHovering(true)
              setHover(star)
            }}
            onFocus={() => {
              setHovering(true)
              setHover(star)
            }}
            onBlur={() => {
              setHovering(false)
              setHover(null)
            }}
            onClick={() => onChange?.(star)}
            title={`${star} из ${maxStars}`}
            aria-label={`Оценка ${star}`}
          >
            {inner}
          </button>
        )
      })}
    </div>
  )
}
