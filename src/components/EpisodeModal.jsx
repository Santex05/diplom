import { useState, useEffect } from 'react'
import { mediaUrl } from '../api'

export default function EpisodeModal({ anime, onClose }) {
  const [activeEpisode, setActiveEpisode] = useState(null)

  useEffect(() => {
    if (anime?.episodes?.length) {
      setActiveEpisode(anime.episodes[0])
    } else {
      setActiveEpisode(null)
    }
  }, [anime])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!anime) return null

  const videoSrc = activeEpisode ? mediaUrl(activeEpisode.path) : ''

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#141820] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <h2 id="modal-title" className="text-lg font-semibold text-white">
            {anime.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#9ca3af] transition hover:bg-white/5 hover:text-white"
            aria-label="Закрыть"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-6 lg:flex-row">
          <div className="lg:w-[55%]">
            {videoSrc ? (
              <video
                key={videoSrc}
                src={videoSrc}
                controls
                className="aspect-video w-full rounded-xl bg-black"
                playsInline
              >
                <track kind="captions" />
              </video>
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-xl bg-black/50 text-[#9ca3af]">
                Нет видеофайлов в папке
              </div>
            )}
            {activeEpisode && (
              <p className="mt-2 text-sm text-[#9ca3af]">{activeEpisode.title}</p>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col lg:w-[45%]">
            <p className="mb-3 text-sm font-medium text-[#9ca3af]">
              Серии ({anime.episodes.length})
            </p>
            <ul className="flex-1 space-y-1 overflow-y-auto pr-1">
              {anime.episodes.map((ep) => (
                <li key={ep.path}>
                  <button
                    type="button"
                    onClick={() => setActiveEpisode(ep)}
                    className={`w-full rounded-lg px-4 py-2.5 text-left text-sm transition ${
                      activeEpisode?.path === ep.path
                        ? 'bg-[#c4b5fd]/20 font-medium text-[#ddd6fe]'
                        : 'text-[#9ca3af] hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {ep.title}
                  </button>
                </li>
              ))}
              {anime.episodes.length === 0 && (
                <li className="px-4 py-6 text-sm text-[#6b7280]">
                  Добавьте видеофайлы (.mp4, .mkv и др.) в папку аниме
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
