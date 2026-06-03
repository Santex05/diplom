import { useEffect, useMemo, useRef, useState } from 'react'

export function isBannerVideoSrc(src) {
  return /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(src || '')
}

function withVideoFrameHint(url) {
  if (!url || url.includes('#')) return url
  return `${url}#t=0.001`
}

/**
 * Медиа баннера: фото через <img>, видео с постером до первого кадра.
 * Все хуки — только в начале (без условных return до хуков).
 */
export default function BannerMedia({
  src,
  fallbackSrc = null,
  alt = '',
  placeholder = 'Фото / видео баннера',
}) {
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const [useFallback, setUseFallback] = useState(false)
  const [videoReady, setVideoReady] = useState(false)

  useEffect(() => {
    setUseFallback(false)
    setVideoReady(false)
  }, [src, fallbackSrc])

  const primarySrc = useMemo(() => {
    if (useFallback && fallbackSrc) return fallbackSrc
    if (src) return src
    return fallbackSrc || ''
  }, [src, fallbackSrc, useFallback])

  const isVideo = Boolean(primarySrc && isBannerVideoSrc(primarySrc))

  const posterSrc = useMemo(() => {
    if (!isVideo) return ''
    if (fallbackSrc && !isBannerVideoSrc(fallbackSrc)) return fallbackSrc
    return ''
  }, [isVideo, fallbackSrc])

  const imageSrc = !isVideo ? primarySrc : ''

  useEffect(() => {
    if (!isVideo || useFallback) return undefined

    const video = videoRef.current
    const container = containerRef.current
    if (!video || !container) return undefined

    video.muted = true
    video.defaultMuted = true
    video.setAttribute('muted', '')

    const tryPlay = () => {
      video.muted = true
      video.play().catch(() => {})
    }

    const onReady = () => setVideoReady(true)

    video.addEventListener('loadeddata', onReady)
    video.addEventListener('canplay', tryPlay)

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) tryPlay()
        else video.pause()
      },
      { threshold: 0.15 },
    )
    observer.observe(container)
    tryPlay()

    return () => {
      video.removeEventListener('loadeddata', onReady)
      video.removeEventListener('canplay', tryPlay)
      observer.disconnect()
    }
  }, [primarySrc, isVideo, useFallback])

  const handleImageError = () => {
    if (fallbackSrc && !useFallback) setUseFallback(true)
  }

  const handleVideoError = () => {
    if (fallbackSrc && !useFallback) setUseFallback(true)
  }

  if (!primarySrc) {
    if (!placeholder) return null
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#0b0e14] px-2 text-center text-xs text-[#6b7280]">
        {placeholder}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-[#0b0e14]">
      {isVideo ? (
        <>
          {posterSrc && (
            <img
              src={posterSrc}
              alt={alt || ''}
              className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-300 ${
                videoReady ? 'opacity-0' : 'opacity-100'
              }`}
              onError={handleImageError}
            />
          )}
          <video
            ref={videoRef}
            src={withVideoFrameHint(primarySrc)}
            poster={posterSrc || undefined}
            className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-300 ${
              videoReady || !posterSrc ? 'opacity-100' : 'opacity-0'
            }`}
            muted
            autoPlay
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            onError={handleVideoError}
          />
        </>
      ) : (
        <img
          src={imageSrc}
          alt={alt || ''}
          className="absolute inset-0 h-full w-full object-cover object-center"
          onError={handleImageError}
        />
      )}
    </div>
  )
}
