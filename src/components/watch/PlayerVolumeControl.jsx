import { useState } from 'react'
import PlayerRange from '../PlayerRange'

export default function PlayerVolumeControl({ volume, muted, onToggleMute, onChange }) {
  const [hover, setHover] = useState(false)
  const display = muted ? 0 : volume

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        className={`flex h-9 items-center overflow-hidden rounded-full transition-[width,background-color,border-color,box-shadow,padding] duration-200 ease-out ${
          hover
            ? 'w-[7.25rem] border border-border-subtle bg-bg-elevated/95 pl-2.5 pr-0.5 shadow-lg backdrop-blur-md'
            : 'w-9 border border-transparent bg-transparent'
        }`}
      >
        <div
          className={`player-volume-slider flex h-9 min-w-0 flex-1 items-center transition-opacity duration-200 ${
            hover ? 'mr-1.5 opacity-100' : 'pointer-events-none w-0 opacity-0'
          }`}
        >
          <PlayerRange
            variant="volume"
            min={0}
            max={1}
            value={display}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-label="Громкость"
            className="player-range--volume w-full min-w-[4.25rem]"
          />
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/90 transition hover:bg-white/12 hover:text-white"
          aria-label="Громкость"
        >
          {muted || display === 0 ? (
            <svg className="h-[1.15rem] w-[1.15rem]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
            </svg>
          ) : (
            <svg className="h-[1.15rem] w-[1.15rem]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
