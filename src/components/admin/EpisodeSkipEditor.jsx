import { useCallback, useEffect, useRef, useState } from 'react'

const THUMB_COUNT = 36
const THUMB_W = 64
const THUMB_H = 36
const DRAG_STEP = 0.1
const MIN_GAP = 0.1

function roundSec(t, step = DRAG_STEP) {
  if (!Number.isFinite(t)) return 0
  return Math.round(t / step) * step
}

function fmtClock(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const total = Math.floor(sec)
  const frac = Math.round((sec - total) * 10)
  const m = Math.floor(total / 60)
  const s = total % 60
  const base = `${m}:${String(s).padStart(2, '0')}`
  return frac > 0 ? `${base}.${frac}` : base
}

function fmtFull(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '00:00.0'
  const total = Math.floor(sec)
  const frac = Math.round((sec - total) * 10)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const f = frac > 0 ? `.${frac}` : ''
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${f}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${f}`
}

/** Секунды, mm:ss, mm:ss.d или просто число */
function parseTimeFlexible(str) {
  const raw = String(str).trim().replace(',', '.')
  if (!raw) return null
  if (raw.includes(':')) {
    const parts = raw.split(':').map((p) => Number(p))
    if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null
    if (parts.length === 1) return parts[0]
    if (parts.length === 2) {
      const [m, rest] = parts
      const [s, frac] = String(rest).split('.')
      const sec = Number(s) || 0
      const f = frac != null && frac !== '' ? Number(`0.${frac}`) : 0
      return m * 60 + sec + (Number.isFinite(f) ? f : 0)
    }
    if (parts.length === 3) {
      const [h, m, s] = parts
      return h * 3600 + m * 60 + s
    }
    return null
  }
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : null
}

const EMPTY = {
  openingStartSeconds: null,
  openingEndSeconds: null,
  endingStartSeconds: null,
  endingEndSeconds: null,
}

function seekVideo(video, t) {
  return new Promise((resolve) => {
    if (!video) {
      resolve()
      return
    }
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      resolve()
    }
    video.addEventListener('seeked', onSeeked)
    video.currentTime = t
  })
}

async function buildFilmstrip(video) {
  const canvas = document.createElement('canvas')
  canvas.width = THUMB_W
  canvas.height = THUMB_H
  const ctx = canvas.getContext('2d')
  if (!ctx || !video.duration) return []

  const wasPaused = video.paused
  const saved = video.currentTime
  const dur = video.duration
  const out = []

  for (let i = 0; i < THUMB_COUNT; i++) {
    const t = (dur / (THUMB_COUNT + 1)) * (i + 1)
    await seekVideo(video, t)
    try {
      ctx.drawImage(video, 0, 0, THUMB_W, THUMB_H)
      out.push(canvas.toDataURL('image/jpeg', 0.55))
    } catch {
      out.push(null)
    }
  }

  video.currentTime = saved
  if (!wasPaused) video.play().catch(() => {})
  return out
}

function TimeField({ label, fieldKey, value, duration, disabled, onApply, onSeek }) {
  const [draft, setDraft] = useState('')
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) {
      setDraft(value != null ? String(roundSec(value, 0.1)) : '')
    }
  }, [value, focused])

  const applyDraft = () => {
    const t = parseTimeFlexible(draft)
    if (t == null) {
      setDraft(value != null ? String(roundSec(value, 0.1)) : '')
      return
    }
    onApply(roundSec(t, 0.1))
  }

  const nudge = (delta) => {
    const base = value ?? 0
    onApply(roundSec(base + delta, 0.1))
  }

  return (
    <div className="rounded-lg border border-white/10 bg-[#0b0e14]/80 p-2.5">
      <p className="mb-2 text-[11px] font-medium text-[#c4b5fd]">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-[120px] flex-1 items-center gap-1">
          <input
            type="text"
            inputMode="decimal"
            disabled={disabled}
            value={focused ? draft : value != null ? String(roundSec(value, 0.1)) : ''}
            placeholder="сек или m:ss"
            onFocus={() => {
              setFocused(true)
              setDraft(value != null ? String(roundSec(value, 0.1)) : '')
            }}
            onBlur={() => {
              setFocused(false)
              applyDraft()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                applyDraft()
                e.currentTarget.blur()
              }
            }}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#07090f] px-2.5 py-2 font-mono text-sm text-white focus:border-accent/50 focus:outline-none"
          />
          <span className="shrink-0 text-[10px] text-[#6b7280]">сек</span>
        </div>
        <div className="flex gap-0.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => nudge(-1)}
            className="rounded-lg border border-white/10 px-2 py-2 text-xs text-white/80 hover:border-accent/40"
            title="-1 сек"
          >
            −1
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => nudge(-0.1)}
            className="rounded-lg border border-white/10 px-2 py-2 text-[10px] text-white/70 hover:border-accent/40"
            title="-0.1 сек"
          >
            −0.1
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => nudge(0.1)}
            className="rounded-lg border border-white/10 px-2 py-2 text-[10px] text-white/70 hover:border-accent/40"
            title="+0.1 сек"
          >
            +0.1
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => nudge(1)}
            className="rounded-lg border border-white/10 px-2 py-2 text-xs text-white/80 hover:border-accent/40"
            title="+1 сек"
          >
            +1
          </button>
        </div>
        {value != null && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSeek(value)}
            className="rounded-lg border border-accent/30 px-2.5 py-2 text-[10px] text-accent hover:bg-accent/10"
          >
            ▶ {fmtClock(value)}
          </button>
        )}
      </div>
      {value != null && duration > 0 && (
        <p className="mt-1.5 font-mono text-[10px] text-[#6b7280]">
          {fmtFull(value)} · {((value / duration) * 100).toFixed(1)}% дорожки
        </p>
      )}
    </div>
  )
}

function TimeRuler({ duration }) {
  if (!duration) return null
  const step =
    duration > 3600 ? 300 : duration > 1200 ? 120 : duration > 600 ? 60 : duration > 180 ? 30 : 10
  const ticks = []
  for (let t = 0; t <= duration; t += step) {
    ticks.push(t)
  }
  return (
    <div className="relative h-5 border-b border-white/10 bg-[#1a1f2e]">
      {ticks.map((t) => (
        <span
          key={t}
          className="absolute top-0 -translate-x-1/2 border-l border-white/20 pl-0.5 text-[9px] tabular-nums text-[#6b7280]"
          style={{ left: `${(t / duration) * 100}%` }}
        >
          {fmtClock(t)}
        </span>
      ))}
    </div>
  )
}

export default function EpisodeSkipEditor({ videoSrc, value, onChange, disabled = false }) {
  const videoRef = useRef(null)
  const trackRef = useRef(null)
  const dragRef = useRef(null)
  const valueRef = useRef(value)

  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [thumbs, setThumbs] = useState([])
  const [waveform, setWaveform] = useState([])
  const [loadingStrip, setLoadingStrip] = useState(false)
  const [activeRegion, setActiveRegion] = useState('opening')

  valueRef.current = { ...EMPTY, ...value }
  const marks = valueRef.current

  const patch = useCallback(
    (partial) => {
      const next = { ...EMPTY, ...valueRef.current, ...partial }
      if (next.openingStartSeconds != null && next.openingEndSeconds != null) {
        if (next.openingEndSeconds <= next.openingStartSeconds) {
          next.openingEndSeconds = roundSec(next.openingStartSeconds + MIN_GAP)
        }
      }
      if (next.endingStartSeconds != null && next.endingEndSeconds != null) {
        if (next.endingEndSeconds <= next.endingStartSeconds) {
          next.endingEndSeconds = roundSec(next.endingStartSeconds + MIN_GAP)
        }
      }
      valueRef.current = next
      onChange?.(next)
    },
    [onChange],
  )

  useEffect(() => {
    setThumbs([])
    setWaveform([])
    setDuration(0)
    setCurrentTime(0)
  }, [videoSrc])

  const loadStrip = useCallback(async () => {
    const video = videoRef.current
    if (!video || !video.duration) return
    setLoadingStrip(true)
    try {
      const t = await buildFilmstrip(video)
      setThumbs(t)
      setWaveform(Array.from({ length: 160 }, (_, i) => 0.12 + 0.4 * Math.abs(Math.sin(i * 0.2))))
    } finally {
      setLoadingStrip(false)
    }
  }, [])

  const clamp = useCallback(
    (t) => roundSec(Math.min(Math.max(0, t), duration || 0), DRAG_STEP),
    [duration],
  )

  const timeFromClientX = useCallback(
    (clientX) => {
      const el = trackRef.current
      if (!el || !duration) return 0
      const rect = el.getBoundingClientRect()
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      return clamp(ratio * duration)
    },
    [clamp, duration],
  )

  const seekTo = (t) => {
    const v = videoRef.current
    if (!v) return
    const c = clamp(t)
    v.currentTime = c
    setCurrentTime(c)
  }

  const opStart = marks.openingStartSeconds ?? 0
  const opEnd = marks.openingEndSeconds
  const edStart = marks.endingStartSeconds
  const edEnd = marks.endingEndSeconds

  const pct = (t) => (duration > 0 && t != null ? (t / duration) * 100 : 0)

  const applyOpening = (partial) => {
    const next = { ...valueRef.current, ...partial }
    if (next.openingEndSeconds != null && next.openingStartSeconds != null) {
      if (next.openingEndSeconds <= next.openingStartSeconds) {
        next.openingEndSeconds = roundSec(next.openingStartSeconds + MIN_GAP)
      }
    }
    patch(next)
  }

  const applyEnding = (partial) => {
    const next = { ...valueRef.current, ...partial }
    if (next.endingEndSeconds != null && next.endingStartSeconds != null) {
      if (next.endingEndSeconds <= next.endingStartSeconds) {
        next.endingEndSeconds = roundSec(next.endingStartSeconds + MIN_GAP)
      }
    }
    if (next.endingEndSeconds != null && duration) {
      next.endingEndSeconds = Math.min(next.endingEndSeconds, duration)
    }
    patch(next)
  }

  const startDrag = (e, region, edge) => {
    if (disabled) return
    e.preventDefault()
    e.stopPropagation()
    setActiveRegion(region)
    dragRef.current = { region, edge }
  }

  const createRegionAt = (region, t) => {
    const time = clamp(t)
    if (region === 'opening') {
      patch({
        openingStartSeconds: time,
        openingEndSeconds: roundSec(Math.min(duration, time + 5)),
      })
    } else {
      patch({
        endingStartSeconds: time,
        endingEndSeconds: roundSec(Math.min(duration, time + 5)),
      })
    }
    setActiveRegion(region)
  }

  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current
      if (!d || disabled) return
      const t = timeFromClientX(e.clientX)
      const m = valueRef.current

      if (d.region === 'opening') {
        const start = m.openingStartSeconds ?? 0
        const end = m.openingEndSeconds ?? start + MIN_GAP
        if (d.edge === 'start') {
          patch({ openingStartSeconds: clamp(Math.min(t, end - MIN_GAP)) })
        } else {
          patch({ openingEndSeconds: clamp(Math.max(t, start + MIN_GAP)) })
        }
        seekTo(t)
      }

      if (d.region === 'ending') {
        const start = m.endingStartSeconds ?? 0
        const end = m.endingEndSeconds ?? start + MIN_GAP
        if (d.edge === 'start') {
          patch({ endingStartSeconds: clamp(Math.min(t, end - MIN_GAP)) })
        } else {
          patch({ endingEndSeconds: clamp(Math.max(t, start + MIN_GAP)) })
        }
        seekTo(t)
      }
    }

    const onUp = () => {
      dragRef.current = null
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [disabled, duration, patch, timeFromClientX, clamp])

  const btnBase = 'rounded-lg px-3 py-1.5 text-xs font-semibold transition border'
  const btnActive = 'border-accent/50 bg-accent/20 text-[#ede9fe] ring-1 ring-accent/40'
  const btnIdle = 'border-white/10 text-[#9ca3af] hover:border-accent/30 hover:text-white'

  if (!videoSrc) {
    return (
      <p className="rounded-lg border border-dashed border-white/10 px-3 py-6 text-center text-xs text-[#6b7280]">
        Загрузите видео серии, чтобы отметить опенинг и эндинг
      </p>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-[#141820]/80 p-3">
      <p className="text-xs text-[#9ca3af]">
        Точность 0.1 сек: тяните края на дорожке или введите секунды вручную (можно «90», «1:30» или
        «1:30.5»). Сохранение — кнопкой «Сохранить OP/ED».
      </p>

      <div className="overflow-hidden rounded-lg border border-white/10 bg-black">
        <video
          ref={videoRef}
          src={videoSrc}
          className="max-h-44 w-full bg-black object-contain"
          controls
          playsInline
          crossOrigin="anonymous"
          onLoadedMetadata={() => {
            const d = videoRef.current?.duration
            if (Number.isFinite(d) && d > 0) {
              setDuration(d)
              loadStrip()
            }
          }}
          onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
        />
        {duration > 0 && (
          <p className="border-t border-white/10 bg-[#0b0e14] px-2 py-1 font-mono text-[10px] text-[#6b7280]">
            Длительность: {roundSec(duration, 0.1)} сек ({fmtFull(duration)})
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setActiveRegion('opening')}
          className={`${btnBase} ${activeRegion === 'opening' ? btnActive : btnIdle}`}
        >
          Опенинг
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setActiveRegion('ending')}
          className={`${btnBase} ${activeRegion === 'ending' ? btnActive : btnIdle}`}
        >
          Эндинг
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => createRegionAt(activeRegion, currentTime)}
          className={`${btnBase} ${btnIdle}`}
        >
          Создать {activeRegion === 'opening' ? 'опенинг' : 'эндинг'} здесь ({fmtClock(currentTime)})
        </button>
        <button
          type="button"
          disabled={disabled || loadingStrip}
          onClick={loadStrip}
          className={`${btnBase} ${btnIdle}`}
        >
          {loadingStrip ? 'Загрузка…' : 'Обновить превью'}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => patch({ ...EMPTY })}
          className={`${btnBase} border-red-500/30 text-red-300 hover:bg-red-500/10`}
        >
          Сбросить
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-accent/25 bg-[#1a1f2e]">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#232936] px-2 py-1.5 text-[10px]">
          <span className="font-medium text-accent">Дорожка</span>
          <span className="font-mono tabular-nums text-white">{fmtFull(currentTime)}</span>
        </div>

        <TimeRuler duration={duration} />

        <div className="relative flex h-9 overflow-hidden border-b border-white/10 bg-[#0b0e14]">
          {loadingStrip && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 text-[10px] text-accent">
              Загрузка кадров…
            </div>
          )}
          {thumbs.length > 0
            ? thumbs.map((src, i) => (
                <div key={i} className="h-full shrink-0 border-r border-black/50" style={{ flex: 1 }}>
                  {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : null}
                </div>
              ))
            : null}
        </div>

        <div
          ref={trackRef}
          className="relative h-[4.5rem] cursor-crosshair select-none bg-[#141820]"
          onClick={(e) => {
            if (dragRef.current || e.target.closest('[data-skip-handle]')) return
            seekTo(timeFromClientX(e.clientX))
          }}
        >
          <div className="absolute inset-x-0 bottom-1 top-3 flex items-end gap-px opacity-60">
            {waveform.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm bg-accent/40"
                style={{ height: `${Math.max(6, h * 100)}%` }}
              />
            ))}
          </div>

          {opEnd != null && (
            <div
              className="absolute inset-y-2 rounded border-2 border-accent bg-accent/30"
              style={{ left: `${pct(opStart)}%`, width: `${Math.max(0.2, pct(opEnd) - pct(opStart))}%` }}
            >
              <span className="absolute left-1 top-0.5 text-[10px] font-bold text-accent">OP</span>
              <button
                type="button"
                data-skip-handle
                aria-label="Начало опенинга"
                onMouseDown={(e) => startDrag(e, 'opening', 'start')}
                className="absolute -left-2 top-0 bottom-0 z-30 w-4 cursor-ew-resize rounded-l-md border border-accent bg-accent shadow-lg"
              />
              <button
                type="button"
                data-skip-handle
                aria-label="Конец опенинга"
                onMouseDown={(e) => startDrag(e, 'opening', 'end')}
                className="absolute -right-2 top-0 bottom-0 z-30 w-4 cursor-ew-resize rounded-r-md border border-accent bg-accent shadow-lg"
              />
            </div>
          )}

          {edStart != null && edEnd != null && (
            <div
              className="absolute inset-y-2 rounded border-2 border-accent-dim bg-accent-dim/25"
              style={{ left: `${pct(edStart)}%`, width: `${Math.max(0.2, pct(edEnd) - pct(edStart))}%` }}
            >
              <span className="absolute left-1 top-0.5 text-[10px] font-bold text-accent-dim">ED</span>
              <button
                type="button"
                data-skip-handle
                aria-label="Начало эндинга"
                onMouseDown={(e) => startDrag(e, 'ending', 'start')}
                className="absolute -left-2 top-0 bottom-0 z-30 w-4 cursor-ew-resize rounded-l-md border border-accent-dim bg-accent-dim shadow-lg"
              />
              <button
                type="button"
                data-skip-handle
                aria-label="Конец эндинга"
                onMouseDown={(e) => startDrag(e, 'ending', 'end')}
                className="absolute -right-2 top-0 bottom-0 z-30 w-4 cursor-ew-resize rounded-r-md border border-accent-dim bg-accent-dim shadow-lg"
              />
            </div>
          )}

          {duration > 0 && (
            <>
              <div
                className="pointer-events-none absolute inset-y-0 z-20 w-px bg-white/30"
                style={{ left: `${pct(currentTime)}%` }}
              />
              <div
                className="pointer-events-none absolute top-0 z-30 h-full w-0.5 bg-white shadow-[0_0_8px_#fff]"
                style={{ left: `${pct(currentTime)}%` }}
              />
              <div
                className="pointer-events-none absolute top-0 z-40 -translate-x-1/2 rounded bg-white px-1 py-0.5 font-mono text-[9px] font-bold text-black"
                style={{ left: `${pct(currentTime)}%` }}
              >
                {fmtFull(currentTime)}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-accent/20 bg-accent/5 p-2">
          <p className="px-1 text-xs font-semibold text-accent">Опенинг</p>
          <TimeField
            label="Начало"
            fieldKey="openingStartSeconds"
            value={marks.openingStartSeconds}
            duration={duration}
            disabled={disabled}
            onApply={(t) => applyOpening({ openingStartSeconds: t })}
            onSeek={seekTo}
          />
          <TimeField
            label="Конец"
            fieldKey="openingEndSeconds"
            value={marks.openingEndSeconds}
            duration={duration}
            disabled={disabled}
            onApply={(t) => applyOpening({ openingEndSeconds: t })}
            onSeek={seekTo}
          />
          {opEnd != null && marks.openingStartSeconds != null && (
            <p className="px-1 font-mono text-[10px] text-[#9ca3af]">
              Длина: {roundSec(opEnd - opStart, 0.1)} сек
            </p>
          )}
        </div>

        <div className="space-y-2 rounded-xl border border-accent-dim/25 bg-accent-dim/5 p-2">
          <p className="px-1 text-xs font-semibold text-accent-dim">Эндинг</p>
          <TimeField
            label="Начало"
            fieldKey="endingStartSeconds"
            value={marks.endingStartSeconds}
            duration={duration}
            disabled={disabled}
            onApply={(t) => applyEnding({ endingStartSeconds: t })}
            onSeek={seekTo}
          />
          <TimeField
            label="Конец"
            fieldKey="endingEndSeconds"
            value={marks.endingEndSeconds}
            duration={duration}
            disabled={disabled}
            onApply={(t) => applyEnding({ endingEndSeconds: t })}
            onSeek={seekTo}
          />
          {edEnd != null && edStart != null && (
            <p className="px-1 font-mono text-[10px] text-[#9ca3af]">
              Длина: {roundSec(edEnd - edStart, 0.1)} сек
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function episodeSkipFromEpisode(ep) {
  if (!ep) return { ...EMPTY }
  return {
    openingStartSeconds: ep.openingStartSeconds ?? null,
    openingEndSeconds: ep.openingEndSeconds ?? null,
    endingStartSeconds: ep.endingStartSeconds ?? null,
    endingEndSeconds: ep.endingEndSeconds ?? null,
  }
}

export function episodePreviewSrc(animeId, ep) {
  if (!ep) return null
  const sources = Array.isArray(ep.sources) ? ep.sources : []
  const file = sources[0]?.file || ep.file
  if (!file) return null
  if (file.startsWith('http') || file.startsWith('/media/')) return file
  const parts = String(file)
    .replace(/\\/g, '/')
    .split('/')
    .map((p) => encodeURIComponent(p))
  return `/media/${encodeURIComponent(animeId)}/${parts.join('/')}`
}
