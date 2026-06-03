const cache = new Map()
const MAX_CACHE = 96
let activeJobs = 0
const waitQueue = []

function drainQueue() {
  if (activeJobs >= 3 || !waitQueue.length) return
  const next = waitQueue.shift()
  next()
}

function runQueued(fn) {
  return new Promise((resolve, reject) => {
    const job = () => {
      activeJobs++
      Promise.resolve()
        .then(fn)
        .then(resolve, reject)
        .finally(() => {
          activeJobs--
          drainQueue()
        })
    }
    if (activeJobs < 3) job()
    else waitQueue.push(job)
  })
}

function cacheSet(key, value) {
  if (cache.size >= MAX_CACHE) {
    const first = cache.keys().next().value
    cache.delete(first)
  }
  cache.set(key, value)
}

/** Детерминированная секунда для превью (не с начала ролика). */
export function randomSeekForEpisode(episodeId, durationSeconds = 0) {
  const id = String(episodeId ?? '')
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  const frac = 0.08 + (hash % 8500) / 10000
  const dur = Number(durationSeconds) || 0
  if (dur > 8) return dur * frac
  return 1.5 + (hash % 48)
}

/**
 * Кадр из видео в момент seekSeconds (data URL). Кэш в памяти.
 */
export function captureEpisodeFrame(videoSrc, seekSeconds) {
  const seek = Math.max(0, Number(seekSeconds) || 0)
  const key = `${videoSrc}@${Math.floor(seek * 2) / 2}`

  if (cache.has(key)) return Promise.resolve(cache.get(key))

  return runQueued(
    () =>
      new Promise((resolve) => {
        const video = document.createElement('video')
        video.crossOrigin = 'anonymous'
        video.muted = true
        video.playsInline = true
        video.preload = 'auto'
        let settled = false
        const finish = (url) => {
          if (settled) return
          settled = true
          video.removeAttribute('src')
          video.load()
          if (url) cacheSet(key, url)
          resolve(url || null)
        }

        const fail = () => finish(null)

        const drawFrame = () => {
          try {
            const w = video.videoWidth
            const h = video.videoHeight
            if (!w || !h) return fail()
            const canvas = document.createElement('canvas')
            const tw = 320
            const th = Math.round((h / w) * tw)
            canvas.width = tw
            canvas.height = th
            const ctx = canvas.getContext('2d')
            if (!ctx) return fail()
            ctx.filter = 'blur(6px)'
            ctx.drawImage(video, 0, 0, tw, th)
            ctx.filter = 'none'
            finish(canvas.toDataURL('image/jpeg', 0.78))
          } catch {
            fail()
          }
        }

        const seekTo = () => {
          const dur = video.duration
          let t = seek
          if (dur > 0 && Number.isFinite(dur)) {
            if (t <= 0) t = Math.min(1, dur * 0.02)
            t = Math.min(t, Math.max(0, dur - 0.25))
          } else if (t <= 0) {
            t = 0.5
          }
          video.currentTime = t
        }

        video.addEventListener('error', fail, { once: true })
        video.addEventListener('loadedmetadata', seekTo, { once: true })
        video.addEventListener('seeked', drawFrame, { once: true })

        setTimeout(fail, 12000)
        video.src = videoSrc
      }),
  )
}
