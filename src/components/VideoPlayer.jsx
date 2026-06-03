import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { reportEpisodeDuration } from '../api'
import PlayerRange from './PlayerRange'
import { usePlayerUi } from '../context/PlayerUiContext'
import {
  getEpisodeSources,
  hasMultipleQualities,
  sourcePlaybackUrl,
} from '../utils/episodeSources'
import {
  loadVolume,
  saveVolume,
  loadPlaybackSpeed,
  savePlaybackSpeed,
  loadProgress,
  saveProgress,
  formatTime,
} from '../utils/playerStorage'
import { isEpisodeCompleted } from '../utils/episodeProgress'
import { loadSitePrefs } from '../utils/sitePrefs'
import PlayerEpisodesPanel from './watch/PlayerEpisodesPanel'
import PlayerNextEpisodeOverlay from './watch/PlayerNextEpisodeOverlay'
import PlayerSettingsMenu from './watch/PlayerSettingsMenu'
import PlayerVolumeControl from './watch/PlayerVolumeControl'

const NEXT_COUNTDOWN_SEC = 5

function getSavedResumeTime(animeId, epId) {
  const urlTime = Number(new URLSearchParams(window.location.search).get('t'))
  if (urlTime > 3) return urlTime

  const saved = loadProgress(animeId, epId)
  if (saved?.currentTime > 10 && !saved.completed && saved.duration > 0) {
    if (!isEpisodeCompleted(saved.currentTime, saved.duration)) {
      return saved.currentTime
    }
  }
  return null
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5]
const SEEK_STEP = 10
const VOLUME_STEP = 0.08

function isEditableElement(el) {
  if (!el || !(el instanceof HTMLElement)) return false
  const tag = el.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable
  )
}

export default function VideoPlayer({
  episode,
  animeId,
  animeTitle,
  episodeTitle,
  episodeNumber,
  cover,
  onEnded,
  onCurrentTime,
  nextEpisode = null,
  onPlayNext,
  onSeriesEnded,
  autoPlayNext: autoPlayNextProp,
  autoPlayOnStart = false,
  requestFullscreenOnStart = false,
  anime = null,
  allEpisodes = [],
  onSelectEpisode,
  hasPrev = false,
  hasNext = false,
  onPrev,
  onNext,
  onBack,
}) {
  const { setPlayerFullscreen } = usePlayerUi()
  const [playerPrefs, setPlayerPrefs] = useState(() => loadSitePrefs())
  const autoPlayNext = autoPlayNextProp ?? playerPrefs.autoPlayNext

  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const saveTimer = useRef(null)
  const hideTimer = useRef(null)
  const durationReported = useRef(false)

  const sourceList = getEpisodeSources(episode, animeId)
  const multiQuality = hasMultipleQualities(episode, animeId)

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(() => loadVolume())
  const [muted, setMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(() => loadPlaybackSpeed())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const pendingResumeRef = useRef(null)
  const shouldAutoPlayRef = useRef(false)
  const [showControls, setShowControls] = useState(true)
  const [activeQuality, setActiveQuality] = useState(
    () => sourceList[0]?.quality ?? 'Оригинал',
  )
  const [menuOpen, setMenuOpen] = useState(null)
  const [episodesOpen, setEpisodesOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsView, setSettingsView] = useState('main')
  const [qualityLoading, setQualityLoading] = useState(false)
  const [nextOverlay, setNextOverlay] = useState(null)
  const [skipUiTick, setSkipUiTick] = useState(0)
  const [centerFlash, setCenterFlash] = useState(null)
  const nextAnimRef = useRef(null)
  const nextOverlayRef = useRef(null)
  const centerFlashTimer = useRef(null)
  const centerFlashKey = useRef(0)
  const keepFullscreenRef = useRef(false)
  const initialFsRef = useRef(requestFullscreenOnStart)
  const openingSkippedRef = useRef(false)
  const endingSkippedRef = useRef(false)
  const episodeEndedRef = useRef(false)
  const lastTimeRef = useRef(0)
  const prevSkipOpeningRef = useRef(loadSitePrefs().skipOpening)
  const prevSkipEndingRef = useRef(loadSitePrefs().skipEnding)

  const opStart = episode?.openingStartSeconds ?? 0
  const opEnd = episode?.openingEndSeconds ?? null
  const edStart = episode?.endingStartSeconds ?? null
  const edEnd = episode?.endingEndSeconds ?? null

  const hasOpeningMark =
    opEnd != null && Number.isFinite(opEnd) && opEnd > (opStart ?? 0) + 0.5
  const hasEndingMark =
    edStart != null &&
    Number.isFinite(edStart) &&
    (edEnd != null ? edEnd > edStart + 0.5 : true)

  useEffect(() => {
    const sync = () => {
      const prefs = loadSitePrefs()
      const v = videoRef.current
      const t = v?.currentTime ?? 0
      const dur = v?.duration || duration

      if (
        prefs.skipOpening &&
        !prevSkipOpeningRef.current &&
        hasOpeningMark &&
        opEnd != null &&
        t >= opStart + 0.3 &&
        t < opEnd - 0.3
      ) {
        openingSkippedRef.current = true
        setSkipUiTick((n) => n + 1)
      }

      if (prefs.skipEnding && !prevSkipEndingRef.current && hasEndingMark && dur > 30) {
        const zoneEnd = edEnd != null && edEnd > 0 ? Math.min(edEnd, dur) : dur - 0.5
        if (t >= (edStart ?? 0) && t < zoneEnd - 0.3) {
          endingSkippedRef.current = true
          setSkipUiTick((n) => n + 1)
        }
      }

      prevSkipOpeningRef.current = prefs.skipOpening
      prevSkipEndingRef.current = prefs.skipEnding
      setPlayerPrefs(prefs)
    }
    window.addEventListener('anicatalog-prefs', sync)
    return () => window.removeEventListener('anicatalog-prefs', sync)
  }, [duration, edEnd, edStart, hasEndingMark, hasOpeningMark, opEnd, opStart])

  const epId = String(episode?.id ?? '')
  const activeSource =
    sourceList.find((s) => s.quality === activeQuality) || sourceList[0]
  const activeSrc = sourcePlaybackUrl(activeSource)

  const persistProgress = useCallback(
    (time, dur, completed = false) => {
      saveProgress(animeId, epId, {
        currentTime: time,
        duration: dur,
        completed,
        animeTitle,
        episodeTitle,
        number: episodeNumber,
        cover,
      })
    },
    [animeId, animeTitle, epId, episodeTitle, episodeNumber, cover],
  )

  useEffect(() => {
    const list = getEpisodeSources(episode, animeId)
    setActiveQuality(list[0]?.quality ?? 'Оригинал')
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setMenuOpen(null)
    if (nextAnimRef.current) {
      cancelAnimationFrame(nextAnimRef.current)
      nextAnimRef.current = null
    }
    setNextOverlay(null)
    durationReported.current = false
    openingSkippedRef.current = false
    endingSkippedRef.current = false
    episodeEndedRef.current = false
    lastTimeRef.current = 0
    const prefs = loadSitePrefs()
    prevSkipOpeningRef.current = prefs.skipOpening
    prevSkipEndingRef.current = prefs.skipEnding

    const resumeAt = getSavedResumeTime(animeId, epId)
    pendingResumeRef.current = resumeAt
    shouldAutoPlayRef.current = resumeAt != null || autoPlayOnStart
  }, [
    animeId,
    epId,
    episode?.id,
    episode?.file,
    episode?.path,
    episode?.openingStartSeconds,
    episode?.openingEndSeconds,
    episode?.endingStartSeconds,
    episode?.endingEndSeconds,
    autoPlayOnStart,
  ])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const vol = loadVolume()
    const rate = loadPlaybackSpeed()
    v.volume = vol
    v.playbackRate = rate
    setVolume(vol)
    setMuted(vol === 0)
    setPlaybackRate(rate)
  }, [activeSrc])

  useEffect(() => {
    const onFs = () => {
      const fs = document.fullscreenElement === containerRef.current
      setIsFullscreen(fs)
      setPlayerFullscreen(fs)
      keepFullscreenRef.current = fs
    }
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [setPlayerFullscreen])

  useEffect(() => {
    initialFsRef.current = requestFullscreenOnStart
    if (sessionStorage.getItem('anicatalog_keep_fs') === '1') {
      keepFullscreenRef.current = true
      sessionStorage.removeItem('anicatalog_keep_fs')
    } else if (!document.fullscreenElement) {
      keepFullscreenRef.current = false
    }
  }, [requestFullscreenOnStart, epId])

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement === el) {
      keepFullscreenRef.current = true
      return
    }
    if (!keepFullscreenRef.current && !requestFullscreenOnStart) return
    el.requestFullscreen().catch(() => {})
  }, [epId, requestFullscreenOnStart])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return undefined

    const startPlayback = () => {
      if (pendingResumeRef.current != null && Number.isFinite(v.duration) && v.duration > 0) {
        const t = Math.min(pendingResumeRef.current, Math.max(0, v.duration - 1))
        v.currentTime = t
        setCurrentTime(t)
        pendingResumeRef.current = null
      }
      if (!shouldAutoPlayRef.current) return
      shouldAutoPlayRef.current = false
      v.play().catch(() => {})
      if (initialFsRef.current && containerRef.current && !document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(() => {})
        initialFsRef.current = false
      }
    }

    if (v.readyState >= 1) startPlayback()
    else v.addEventListener('loadedmetadata', startPlayback, { once: true })
    return () => v.removeEventListener('loadedmetadata', startPlayback)
  }, [epId, activeSrc, autoPlayOnStart])

  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuOpen])

  const bumpControls = () => {
    setShowControls(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    if (playing) {
      hideTimer.current = setTimeout(() => setShowControls(false), 3000)
    }
  }

  const handleLoadedMetadata = () => {
    const v = videoRef.current
    if (!v || !Number.isFinite(v.duration) || v.duration <= 0) return
    setDuration(v.duration)
    if (!durationReported.current && animeId && epId) {
      durationReported.current = true
      const known = episode?.durationSeconds
      if (!known || Math.abs(known - v.duration) > 1) {
        reportEpisodeDuration(animeId, epId, v.duration)
      }
    }
  }

  const syncSkipStateForTime = useCallback(
    (t, dur) => {
      let changed = false
      if (episodeEndedRef.current && dur > 0 && t < opStart + 0.5) {
        episodeEndedRef.current = false
        openingSkippedRef.current = false
        endingSkippedRef.current = false
        changed = true
      }
      if (hasOpeningMark && opEnd != null && t < opStart - 0.25 && openingSkippedRef.current) {
        openingSkippedRef.current = false
        changed = true
      }
      if (hasEndingMark && edStart != null && t < edStart - 0.5 && endingSkippedRef.current) {
        endingSkippedRef.current = false
        changed = true
      }
      if (changed) setSkipUiTick((n) => n + 1)
    },
    [edStart, hasEndingMark, hasOpeningMark, opEnd, opStart],
  )

  const handleTimeUpdate = () => {
    const v = videoRef.current
    if (!v) return
    const prefs = loadSitePrefs()
    const dur = v.duration || duration
    const prevT = lastTimeRef.current
    const t = v.currentTime
    lastTimeRef.current = t

    syncSkipStateForTime(t, dur)

    if (!episodeEndedRef.current) {
      if (
        prefs.skipOpening &&
        hasOpeningMark &&
        !openingSkippedRef.current &&
        prevT < opStart + 0.3 &&
        t >= opStart + 0.3 &&
        t < opEnd - 0.3
      ) {
        openingSkippedRef.current = true
        seek(opEnd)
        return
      }

      if (prefs.skipEnding && hasEndingMark && dur > 30) {
        const zoneEnd = edEnd != null && edEnd > 0 ? Math.min(edEnd, dur) : dur - 0.5
        if (
          !endingSkippedRef.current &&
          prevT < (edStart ?? 0) &&
          t >= edStart &&
          t < zoneEnd - 0.3
        ) {
          endingSkippedRef.current = true
          seek(Math.max(zoneEnd, dur - 0.5))
          return
        }
      }
    }

    setCurrentTime(t)
    onCurrentTime?.(v.currentTime)
    if (saveTimer.current) return
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null
      const completed = isEpisodeCompleted(v.currentTime, v.duration)
      persistProgress(v.currentTime, v.duration, completed)
    }, 2000)
  }

  const preserveFullscreenForNavigate = useCallback(() => {
    if (document.fullscreenElement) {
      sessionStorage.setItem('anicatalog_keep_fs', '1')
      keepFullscreenRef.current = true
    }
  }, [])

  const cancelNextCountdown = useCallback(() => {
    if (nextAnimRef.current) {
      cancelAnimationFrame(nextAnimRef.current)
      nextAnimRef.current = null
    }
    setNextOverlay(null)
  }, [])

  const playNextNow = useCallback(() => {
    preserveFullscreenForNavigate()
    cancelNextCountdown()
    onPlayNext?.()
  }, [cancelNextCountdown, onPlayNext, preserveFullscreenForNavigate])

  const closePlayerPanels = useCallback(() => {
    setSettingsOpen(false)
    setSettingsView('main')
    setEpisodesOpen(false)
  }, [])

  const showNextEpisodePrompt = useCallback(
    (mode) => {
      if (!nextEpisode) return
      if (nextAnimRef.current) {
        cancelAnimationFrame(nextAnimRef.current)
        nextAnimRef.current = null
      }
      setPlaying(false)
      setShowControls(true)
      closePlayerPanels()
      videoRef.current?.pause()
      if (mode === 'manual') {
        setNextOverlay({ mode: 'manual', progress: null })
        return
      }

      setNextOverlay({ mode: 'auto', progress: 0 })
      const startedAt = performance.now()

      const tick = (now) => {
        const elapsed = (now - startedAt) / 1000
        const progress = Math.min(1, elapsed / NEXT_COUNTDOWN_SEC)
        setNextOverlay({ mode: 'auto', progress })
        if (progress >= 1) {
          nextAnimRef.current = null
          preserveFullscreenForNavigate()
          setNextOverlay(null)
          onPlayNext?.()
          return
        }
        nextAnimRef.current = requestAnimationFrame(tick)
      }

      nextAnimRef.current = requestAnimationFrame(tick)
    },
    [closePlayerPanels, nextEpisode, onPlayNext, preserveFullscreenForNavigate],
  )

  const handleEnded = () => {
    episodeEndedRef.current = true
    setSkipUiTick((n) => n + 1)
    const v = videoRef.current
    persistProgress(v?.duration ?? duration, v?.duration ?? duration, true)
    if (nextEpisode) {
      showNextEpisodePrompt(autoPlayNext ? 'auto' : 'manual')
      return
    }
    setPlaying(false)
    setShowControls(true)
    if (onSeriesEnded) {
      onSeriesEnded()
      return
    }
    onEnded?.()
  }

  useEffect(() => () => cancelNextCountdown(), [cancelNextCountdown])

  useEffect(() => {
    if (nextOverlay && containerRef.current) {
      containerRef.current.focus({ preventScroll: true })
    }
  }, [nextOverlay])

  const endingZoneEnd =
    duration > 0 && hasEndingMark
      ? edEnd != null && edEnd > 0
        ? Math.min(edEnd, duration)
        : duration - 0.5
      : null

  const inOpeningZone =
    hasOpeningMark &&
    opEnd != null &&
    currentTime >= opStart - 0.5 &&
    currentTime < opEnd - 0.3

  const inEndingZone =
    hasEndingMark &&
    duration > 0 &&
    endingZoneEnd != null &&
    currentTime >= (edStart ?? 0) - 0.5 &&
    currentTime < endingZoneEnd - 0.3

  const showManualSkipOpening = inOpeningZone && !openingSkippedRef.current

  const showManualSkipEnding =
    inEndingZone && !episodeEndedRef.current && !endingSkippedRef.current

  void skipUiTick

  const showCenterFlash = useCallback((kind) => {
    centerFlashKey.current += 1
    setCenterFlash({ kind, key: centerFlashKey.current })
    if (centerFlashTimer.current) clearTimeout(centerFlashTimer.current)
    centerFlashTimer.current = setTimeout(() => setCenterFlash(null), 700)
  }, [])

  useEffect(
    () => () => {
      if (centerFlashTimer.current) clearTimeout(centerFlashTimer.current)
    },
    [],
  )

  const togglePlay = () => {
    if (nextOverlayRef.current != null) return
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play()
      setPlaying(true)
      showCenterFlash('play')
    } else {
      v.pause()
      setPlaying(false)
      setShowControls(true)
      showCenterFlash('pause')
    }
  }

  const seek = (value) => {
    const v = videoRef.current
    if (!v || !Number.isFinite(value)) return
    v.currentTime = value
    lastTimeRef.current = value
    syncSkipStateForTime(value, v.duration || duration)
    setCurrentTime(value)
    persistProgress(value, v.duration)
  }

  const skipOpeningNow = () => {
    if (!hasOpeningMark) return
    openingSkippedRef.current = true
    setSkipUiTick((n) => n + 1)
    seek(opEnd)
  }

  const skipEndingNow = () => {
    const v = videoRef.current
    const dur = v?.duration || duration
    if (!hasEndingMark || !dur) return
    endingSkippedRef.current = true
    setSkipUiTick((n) => n + 1)
    const zoneEnd = edEnd != null && edEnd > 0 ? Math.min(edEnd, dur) : dur - 0.5
    seek(Math.max(zoneEnd, dur - 0.5))
  }

  const changeVolume = (val) => {
    const v = videoRef.current
    if (!v) return
    const vol = Math.min(1, Math.max(0, Number(val)))
    v.volume = vol
    v.muted = vol === 0
    setVolume(vol)
    setMuted(vol === 0)
    saveVolume(vol)
  }

  const toggleMute = () => {
    const v = videoRef.current
    if (!v) return
    if (v.muted || v.volume === 0) {
      const restored = volume > 0 ? volume : 0.8
      v.muted = false
      v.volume = restored
      setVolume(restored)
      setMuted(false)
      saveVolume(restored)
    } else {
      v.muted = true
      setMuted(true)
    }
  }

  const changeSpeed = (rate) => {
    const v = videoRef.current
    if (!v) return
    v.playbackRate = rate
    setPlaybackRate(rate)
    savePlaybackSpeed(rate)
  }

  const resetSpeed = () => changeSpeed(1)

  const switchQuality = (quality) => {
    if (quality === activeQuality) {
      setSettingsOpen(false)
      setSettingsView('main')
      return
    }
    const v = videoRef.current
    const wasPlaying = v && !v.paused
    const t = v?.currentTime ?? currentTime
    persistProgress(t, v?.duration ?? duration)
    setQualityLoading(true)
    setSettingsOpen(false)
    setSettingsView('main')
    setActiveQuality(quality)
    requestAnimationFrame(() => {
      const el = videoRef.current
      if (!el) return
      const apply = () => {
        el.currentTime = t
        setCurrentTime(t)
        setQualityLoading(false)
        if (wasPlaying) el.play()
      }
      if (el.readyState >= 1) apply()
      else el.addEventListener('loadedmetadata', apply, { once: true })
    })
  }

  const toggleFullscreen = () => {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) el.requestFullscreen()
    else document.exitFullscreen()
  }

  const shouldHandleKeyboard = useCallback(() => {
    const active = document.activeElement
    if (isEditableElement(active)) return false
    const root = containerRef.current
    if (!root) return false
    if (root.contains(active)) return true
    return active === document.body || active === document.documentElement
  }, [])

  nextOverlayRef.current = nextOverlay

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!shouldHandleKeyboard()) return

      if (e.code === 'Space') {
        e.preventDefault()
        setMenuOpen(null)
        if (nextOverlayRef.current != null) {
          playNextNow()
          return
        }
        togglePlay()
        return
      }

      if (nextOverlayRef.current != null) {
        e.preventDefault()
        return
      }

      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault()
        setMenuOpen(null)
        const v = videoRef.current
        if (!v) return
        const delta = e.code === 'ArrowLeft' ? -SEEK_STEP : SEEK_STEP
        const max = v.duration || duration
        const next = Math.min(max, Math.max(0, v.currentTime + delta))
        seek(next)
        bumpControls()
        return
      }

      if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        e.preventDefault()
        setMenuOpen(null)
        const v = videoRef.current
        if (!v) return
        const delta = e.code === 'ArrowUp' ? VOLUME_STEP : -VOLUME_STEP
        const base = v.muted || v.volume === 0 ? 0 : v.volume
        changeVolume(base + delta)
        bumpControls()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [shouldHandleKeyboard, duration, epId, playNextNow])

  if (!activeSrc) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center bg-black text-text-muted">
        Видеофайл не найден
      </div>
    )
  }

  const controlsVisible = showControls || !playing

  const qualityLabel = multiQuality
    ? activeQuality
    : sourceList[0]?.quality || 'Исходное'

  const overlayBtn =
    'flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white disabled:opacity-30'

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className={`group/player relative h-full w-full overflow-hidden bg-black outline-none ${
        isFullscreen ? 'flex flex-col' : ''
      }`}
      onMouseMove={bumpControls}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <div
        className={`relative h-full w-full overflow-hidden bg-black ${isFullscreen ? 'min-h-0 flex-1' : ''}`}
      >
        <video
          ref={videoRef}
          key={`${epId}-${activeQuality}`}
          src={activeSrc}
          className="h-full w-full object-contain"
          playsInline
          onClick={togglePlay}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => {
            setPlaying(true)
            bumpControls()
            const v = videoRef.current
            if (v) {
              onCurrentTime?.(v.currentTime)
              persistProgress(
                v.currentTime,
                v.duration || duration,
                isEpisodeCompleted(v.currentTime, v.duration),
              )
            }
          }}
          onPause={() => {
            setPlaying(false)
            setShowControls(true)
          }}
          onEnded={handleEnded}
        />

        {nextOverlay != null && nextEpisode && (
          <PlayerNextEpisodeOverlay
            progress={nextOverlay.mode === 'auto' ? nextOverlay.progress : null}
            nextEpisode={nextEpisode}
            animeTitle={animeTitle}
            onPlayNow={playNextNow}
            onCancel={cancelNextCountdown}
            showSpaceHint
          />
        )}

        {(showManualSkipOpening || showManualSkipEnding) && nextOverlay == null && (
          <div className="pointer-events-none absolute bottom-[10.5rem] right-4 z-[15] flex max-w-[min(100%,14rem)] flex-col items-end gap-2 sm:bottom-[11.5rem] sm:right-6 sm:max-w-none">
            {showManualSkipOpening && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  skipOpeningNow()
                }}
                className="pointer-events-auto min-h-[2.75rem] w-full rounded-2xl border-2 border-accent/50 bg-accent/25 px-4 py-2.5 text-sm font-bold text-[#f5f3ff] shadow-xl shadow-accent/20 backdrop-blur-md transition hover:border-accent hover:bg-accent/40 sm:min-w-[200px] sm:px-6 sm:py-3"
              >
                Пропустить опенинг
              </button>
            )}
            {showManualSkipEnding && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  skipEndingNow()
                }}
                className="pointer-events-auto min-h-[2.75rem] w-full rounded-2xl border-2 border-accent-dim/55 bg-accent-dim/20 px-4 py-2.5 text-sm font-bold text-[#ede9fe] shadow-xl shadow-accent/15 backdrop-blur-md transition hover:border-accent-dim hover:bg-accent-dim/35 sm:min-w-[200px] sm:px-6 sm:py-3"
              >
                Пропустить эндинг
              </button>
            )}
          </div>
        )}

        {qualityLoading && (
          <div className="absolute inset-0 z-[22] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
              <p className="text-sm text-white/80">Загрузка качества…</p>
            </div>
          </div>
        )}

        {settingsOpen && (
          <button
            type="button"
            className="absolute inset-0 z-[38] cursor-default bg-transparent"
            onClick={closePlayerPanels}
            aria-label="Закрыть настройки"
          />
        )}

        {settingsOpen && (
          <div
            className="absolute bottom-24 right-4 z-[50] sm:right-6 sm:bottom-28"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
          >
            <PlayerSettingsMenu
              open={settingsOpen}
              onClose={closePlayerPanels}
              view={settingsView}
              onViewChange={setSettingsView}
              playbackRate={playbackRate}
              onSpeed={changeSpeed}
              speedOptions={SPEED_OPTIONS}
              multiQuality={multiQuality}
              sourceList={sourceList}
              activeQuality={activeQuality}
              onQuality={switchQuality}
              qualityLabel={qualityLabel}
              onPrefsChange={setPlayerPrefs}
            />
          </div>
        )}

        {episodesOpen && anime && (
          <PlayerEpisodesPanel
            anime={anime}
            episodes={allEpisodes}
            currentEpisodeId={epId}
            fullscreen={isFullscreen}
            onSelect={(ep) => {
              setEpisodesOpen(false)
              onSelectEpisode?.(ep)
            }}
            onClose={() => setEpisodesOpen(false)}
          />
        )}

        {!playing && nextOverlay == null && (
          <div
            className="pointer-events-none absolute inset-0 z-[4] bg-black/50 transition-opacity duration-300"
            aria-hidden
          />
        )}

        {centerFlash && nextOverlay == null && (
          <div
            key={centerFlash.key}
            className="pointer-events-none absolute inset-0 z-[12] flex items-center justify-center"
            aria-hidden
          >
            <div className="player-center-flash flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-black/50 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md sm:h-20 sm:w-20">
              {centerFlash.kind === 'play' ? (
                <svg
                  className="ml-1.5 h-11 w-11 text-white drop-shadow-lg sm:h-12 sm:w-12"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg
                  className="h-11 w-11 text-white drop-shadow-lg sm:h-12 sm:w-12"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              )}
            </div>
          </div>
        )}

        <div
          className={`absolute inset-x-0 top-0 bg-gradient-to-b from-black/90 via-black/40 to-transparent px-5 pb-20 pt-5 transition-opacity duration-300 sm:px-8 sm:pt-6 ${
            nextOverlay != null ? 'z-[25]' : 'z-10'
          } ${
            nextOverlay != null || controlsVisible
              ? 'opacity-100'
              : 'pointer-events-none opacity-0'
          }`}
        >
          <div className="flex min-h-10 items-center gap-3 sm:gap-4">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-sm transition hover:border-accent/30 hover:bg-black/65"
                aria-label="Назад к аниме"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h1 className="min-w-0 flex-1 line-clamp-2 font-display text-base font-bold leading-tight text-white sm:text-lg">
              {animeTitle}
            </h1>
          </div>
        </div>

        <div
          className={`absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/95 via-black/55 to-transparent px-5 pb-5 pt-24 transition-opacity duration-300 sm:px-8 sm:pb-6 ${
            nextOverlay != null
              ? 'pointer-events-none opacity-0'
              : controlsVisible
                ? 'opacity-100'
                : 'pointer-events-none opacity-0'
          }`}
        >
          <div className="mb-4 flex items-end justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white/70">Эпизод {episodeNumber}</p>
              {episodeTitle && (
                <p className="mt-0.5 line-clamp-2 text-base font-semibold leading-snug text-white sm:text-lg">
                  {episodeTitle}
                </p>
              )}
            </div>
            <p className="shrink-0 text-sm tabular-nums text-white/90">
              {formatTime(currentTime)} / {formatTime(duration)}
            </p>
          </div>

          <PlayerRange
            variant="progress"
            min={0}
            max={duration || 0}
            value={currentTime}
            disabled={nextOverlay != null}
            onChange={(e) => {
              if (nextOverlay != null) return
              seek(Number(e.target.value))
            }}
            className="mb-5"
            aria-label="Прогресс просмотра"
          />

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="flex items-center justify-start">
              {anime && allEpisodes.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (episodesOpen) setEpisodesOpen(false)
                    else {
                      setEpisodesOpen(true)
                      setSettingsOpen(false)
                    }
                  }}
                  className={`${overlayBtn} ${episodesOpen ? 'bg-white/15' : ''}`}
                  title="Эпизоды"
                  aria-label="Эпизоды"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10" />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex items-center justify-center gap-6 sm:gap-10">
              <button
                type="button"
                onClick={onPrev}
                disabled={!hasPrev}
                className={overlayBtn}
                title="Предыдущий эпизод"
                aria-label="Предыдущий эпизод"
              >
                <svg className="h-7 w-7 sm:h-8 sm:w-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="flex h-12 w-12 items-center justify-center rounded-full text-white transition hover:scale-105 sm:h-14 sm:w-14"
                aria-label={playing ? 'Пауза' : 'Воспроизвести'}
              >
                {playing ? (
                  <svg className="h-10 w-10 sm:h-11 sm:w-11" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="h-10 w-10 sm:h-11 sm:w-11" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={!hasNext}
                className={overlayBtn}
                title="Следующий эпизод"
                aria-label="Следующий эпизод"
              >
                <svg className="h-7 w-7 sm:h-8 sm:w-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 18h2V6h-2M6 18l8.5-6L6 6z" />
                </svg>
              </button>
            </div>
            <div className="flex items-center justify-end gap-0.5">
              <PlayerVolumeControl
                volume={volume}
                muted={muted}
                onToggleMute={toggleMute}
                onChange={changeVolume}
              />
              {playbackRate !== 1 && (
                <button
                  type="button"
                  onClick={resetSpeed}
                  className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-white transition hover:bg-white/25"
                  title="Сбросить скорость на 1x"
                >
                  {playbackRate}x
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (settingsOpen) closePlayerPanels()
                  else {
                    setSettingsOpen(true)
                    setSettingsView('main')
                    setEpisodesOpen(false)
                  }
                }}
                className={`${overlayBtn} relative ${settingsOpen ? 'z-[51] bg-white/15' : ''}`}
                aria-label="Настройки"
              >
                {settingsOpen && (
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                )}
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={async () => {
                  const v = videoRef.current
                  if (!v) return
                  try {
                    if (document.pictureInPictureElement) await document.exitPictureInPicture()
                    else if (document.pictureInPictureEnabled) await v.requestPictureInPicture()
                  } catch {
                    /* ignore */
                  }
                }}
                className={overlayBtn}
                aria-label="Картинка в картинке"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 4h10a2 2 0 012 2v10M7 16H5a2 2 0 01-2-2V6a2 2 0 012-2h2" />
                </svg>
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className={overlayBtn}
                aria-label="Полный экран"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
