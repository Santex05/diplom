import { useEffect, useState } from 'react'
import AnimePoster from './AnimePoster'
import { defaultSource, sourcePlaybackUrl } from '../utils/episodeSources'
import { captureEpisodeFrame } from '../utils/episodeThumbnail'

export default function EpisodeFrameThumbnail({
  animeId,
  episodeMeta,
  seekSeconds = 0,
  cover,
  episodeNumber,
  progressPct = 0,
  highlight = false,
  className = 'w-28 sm:w-32',
}) {
  const [frameUrl, setFrameUrl] = useState(null)
  const [loading, setLoading] = useState(true)

  const videoSrc = episodeMeta
    ? sourcePlaybackUrl(defaultSource(episodeMeta, animeId))
    : ''

  useEffect(() => {
    let cancelled = false
    if (!videoSrc) {
      setFrameUrl(null)
      setLoading(false)
      return
    }
    setLoading(true)
    captureEpisodeFrame(videoSrc, seekSeconds).then((url) => {
      if (cancelled) return
      setFrameUrl(url)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [videoSrc, seekSeconds])

  return (
    <div
      className={`relative aspect-video shrink-0 overflow-hidden rounded-lg border ${className} ${
        highlight ? 'border-accent/50 ring-1 ring-accent/30' : 'border-white/10'
      }`}
    >
      {frameUrl ? (
        <img src={frameUrl} alt="" loading="lazy" className="h-full w-full scale-105 object-cover" />
      ) : (
        <AnimePoster
          cover={cover}
          alt=""
          className="h-full w-full"
          imgClassName={`h-full w-full object-cover ${loading && videoSrc ? 'opacity-40' : ''}`}
        />
      )}
      {loading && videoSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
        </div>
      )}
      <span
        className={`absolute left-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold shadow-md ${
          highlight ? 'bg-accent text-bg-dark' : 'bg-black/75 text-white backdrop-blur-sm'
        }`}
      >
        {episodeNumber != null ? `Серия ${episodeNumber}` : 'Серия'}
      </span>
      {progressPct > 0 && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-black/50">
          <div
            className={`h-full ${progressPct >= 100 ? 'bg-emerald-400/90' : 'bg-accent'}`}
            style={{ width: `${Math.min(100, progressPct)}%` }}
          />
        </div>
      )}
    </div>
  )
}
