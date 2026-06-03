import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  adminFetchAnime,
  adminCreateAnime,
  adminUpdateAnimeMeta,
  adminDeleteAnime,
  adminUploadPoster,
  adminUploadBackground,
  adminAddEpisode,
  adminAddEpisodeSource,
  adminUpdateEpisode,
  adminDeleteEpisode,
  adminRemoveEpisodeSource,
  adminSyncDurations,
  checkServerHealth,
} from '../../api'
import { QUALITY_PRESETS } from '../../constants/qualities'
import {
  ANIME_TYPES,
  ANIME_SEASONS,
  resolveAnimeType,
  resolveAnimeSeason,
  formatDurationRu,
  computeWatchStats,
} from '../../constants/animeMeta'
import { mediaUrl } from '../../api'
import { ADMIN_GENRES } from '../../constants/admin'
import { genreLabel } from '../../constants/genres'
import { AGE_RATING_OPTIONS } from '../../constants/catalogFilters'
import EpisodeSkipEditor, {
  episodePreviewSrc,
  episodeSkipFromEpisode,
} from '../../components/admin/EpisodeSkipEditor'

const emptyQuality = () => ({ quality: '1080p', videoFile: null })
const emptyUploadRow = () => ({ rowId: crypto.randomUUID(), quality: '1080p', videoFile: null })

function episodeSourcesList(ep) {
  if (Array.isArray(ep?.sources) && ep.sources.length > 0) return ep.sources
  if (ep?.file) return [{ quality: 'Оригинал', file: ep.file }]
  return []
}

const emptyEpisode = (n = 1) => ({
  localId: crypto.randomUUID(),
  number: n,
  title: '',
  description: '',
  qualities: [emptyQuality()],
  status: 'idle',
})

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#c4b5fd]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-[#6b7280]">{hint}</span>}
    </label>
  )
}

const inputClass =
  'w-full rounded-xl border border-white/10 bg-[#0b0e14]/80 px-4 py-2.5 text-white transition focus:border-[#c4b5fd]/50 focus:outline-none focus:ring-2 focus:ring-[#c4b5fd]/20'

const chipBtnClass = (active) =>
  `rounded-full px-3 py-1.5 text-sm font-medium transition ${
    active
      ? 'bg-[#c4b5fd] text-[#1e1b4b]'
      : 'border border-white/10 text-[#9ca3af] hover:border-[#c4b5fd]/40 hover:text-white'
  }`

function mergeMultiFileProgress(fileIndex, fileCount, { phase, percent }) {
  const slice = 100 / fileCount
  const base = fileIndex * slice
  if (phase === 'processing' && percent >= 100) {
    return Math.min(100, Math.round(base + slice))
  }
  if (phase === 'processing') {
    return Math.round(base + slice * 0.92)
  }
  const p = percent ?? 40
  return Math.round(base + (p / 100) * slice * 0.88)
}

function EpisodeUploadProgress({ progress }) {
  if (!progress) return null
  const { percent, phase } = progress
  const label =
    phase === 'processing'
      ? percent >= 100
        ? 'Готово'
        : 'Сжатие на сервере…'
      : percent != null
        ? `Загрузка на сервер ${percent}%`
        : 'Загрузка…'
  const width = percent != null ? `${Math.min(100, percent)}%` : '35%'

  return (
    <div className="mt-2 w-full max-w-md" role="status" aria-live="polite">
      <div className="mb-1 flex justify-between text-xs text-[#9ca3af]">
        <span>{label}</span>
        {percent != null && <span className="tabular-nums text-[#c4b5fd]">{percent}%</span>}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full bg-[#c4b5fd] transition-[width] duration-200 ease-out ${
            percent == null ? 'animate-pulse' : ''
          }`}
          style={{ width }}
        />
      </div>
    </div>
  )
}

export default function AdminAnimeForm() {
  const { id: rawId } = useParams()
  const id = rawId ? decodeURIComponent(rawId) : ''
  const isNew = id === 'new'
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [year, setYear] = useState('')
  const [ageRating, setAgeRating] = useState('')
  const [animeType, setAnimeType] = useState('TV')
  const [season, setSeason] = useState('')
  const [description, setDescription] = useState('')
  const [genres, setGenres] = useState([])
  const [isNewFlag, setIsNewFlag] = useState(true)
  const [isPopular, setIsPopular] = useState(false)
  const [isRecommended, setIsRecommended] = useState(false)
  const [posterFile, setPosterFile] = useState(null)
  const [backgroundFile, setBackgroundFile] = useState(null)
  const [coverUrl, setCoverUrl] = useState(null)
  const [backgroundVideoUrl, setBackgroundVideoUrl] = useState(null)
  const [existingEpisodes, setExistingEpisodes] = useState([])
  const [newEpisodes, setNewEpisodes] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [animeId, setAnimeId] = useState(isNew ? null : id)
  const [loading, setLoading] = useState(!isNew)
  /** epId → строки загрузки качеств для существующих серий */
  const [uploadRows, setUploadRows] = useState({})
  const [uploadingEp, setUploadingEp] = useState(null)
  /** epId / localId → { percent, phase } */
  const [uploadProgress, setUploadProgress] = useState({})
  const [savingSkipEp, setSavingSkipEp] = useState(null)
  const [skipDrafts, setSkipDrafts] = useState({})
  const [newVideoPreviews, setNewVideoPreviews] = useState({})
  const [serverOk, setServerOk] = useState(true)

  useEffect(() => {
    checkServerHealth().then((h) =>
      setServerOk(Boolean(h.admin) && (h.apiVersion || 1) >= 2),
    )
  }, [])

  useEffect(() => {
    if (isNew) return
    let cancelled = false
    setLoading(true)
    adminFetchAnime()
      .then(async (list) => {
        const a = list.find((x) => x.id === id || decodeURIComponent(x.id) === id)
        if (!a) throw new Error('Аниме не найдено')
        if (cancelled) return
        setAnimeId(a.id)
        applyAnimeFromRecord(a)
        try {
          const data = await adminSyncDurations(a.id)
          if (!cancelled && data?.anime?.episodes) {
            setExistingEpisodes((eps) =>
              eps.map((ep) => {
                const u = data.anime.episodes.find((x) => x.id === ep.id)
                return u?.durationSeconds
                  ? { ...ep, durationSeconds: u.durationSeconds }
                  : ep
              }),
            )
          }
        } catch {
          /* длительность опциональна */
        }
      })
      .catch((e) => {
        if (e.message.includes('Сессия')) navigate('/admin/login', { replace: true })
        else setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, isNew, navigate])

  function toggleGenre(g) {
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))
  }

  function patchExistingEpisode(epId, patch) {
    setExistingEpisodes((list) =>
      list.map((ep) => (ep.id === epId ? { ...ep, ...patch } : ep)),
    )
  }

  const payload = () => ({
    title: title.trim(),
    description: description.trim(),
    year: year ? Number(year) : null,
    ageRating: ageRating || null,
    type: animeType,
    season: season || null,
    genres,
    categories: { isNew: isNewFlag, isPopular, isRecommended },
  })

  const watchStats = computeWatchStats(existingEpisodes)

  function applyAnimeFromRecord(a) {
    if (!a) return
    setTitle(a.title || '')
    setYear(a.year != null && a.year !== '' ? String(a.year) : '')
    setAgeRating(a.ageRating || '')
    setAnimeType(resolveAnimeType(a))
    setSeason(resolveAnimeSeason(a))
    setDescription(a.description || '')
    setGenres(a.genres || [])
    setIsNewFlag(Boolean(a.categories?.isNew))
    setIsPopular(Boolean(a.categories?.isPopular))
    setIsRecommended(Boolean(a.categories?.isRecommended))
    setExistingEpisodes(a.episodes || [])
    const drafts = {}
    for (const ep of a.episodes || []) {
      drafts[ep.id] = episodeSkipFromEpisode(ep)
    }
    setSkipDrafts(drafts)
    if (a.poster) setCoverUrl(mediaUrl(`/media/${encodeURIComponent(a.id)}/${a.poster}`))
    else if (a.cover) setCoverUrl(mediaUrl(a.cover))
    setBackgroundVideoUrl(a.backgroundVideo ? mediaUrl(a.backgroundVideo) : null)
  }

  /** Только список серий — не трогаем тип, сезон, жанры (чтобы не сбрасывать форму) */
  async function refreshEpisodesOnly(savedId) {
    const list = await adminFetchAnime()
    const a = list.find((x) => x.id === savedId)
    if (a?.episodes) {
      setExistingEpisodes(a.episodes)
      setSkipDrafts((prev) => {
        const next = { ...prev }
        for (const ep of a.episodes) {
          next[ep.id] = episodeSkipFromEpisode(ep)
        }
        return next
      })
    }
    return a
  }

  function applyMetaFromSaved(serverAnime, meta) {
    setAnimeType(resolveAnimeType(serverAnime) || meta.type || 'TV')
    setSeason(resolveAnimeSeason(serverAnime) || meta.season || '')
    setTitle(serverAnime?.title ?? meta.title)
    setYear(
      serverAnime?.year != null && serverAnime?.year !== ''
        ? String(serverAnime.year)
        : meta.year != null
          ? String(meta.year)
          : '',
    )
    setDescription(serverAnime?.description ?? meta.description ?? '')
    setGenres(serverAnime?.genres ?? meta.genres ?? [])
    if (serverAnime?.categories || meta.categories) {
      const c = serverAnime?.categories ?? meta.categories
      setIsNewFlag(Boolean(c.isNew))
      setIsPopular(Boolean(c.isPopular))
      setIsRecommended(Boolean(c.isRecommended))
    }
  }

  function getUploadRows(epId) {
    return uploadRows[epId] || [emptyUploadRow()]
  }

  function setUploadRowsFor(epId, rows) {
    setUploadRows((prev) => ({ ...prev, [epId]: rows }))
  }

  const progressKeyExisting = (epId) => `ep-${epId}`
  const progressKeyNew = (localId) => `new-${localId}`

  function patchUploadProgress(key, patch) {
    setUploadProgress((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  function clearUploadProgress(key) {
    setUploadProgress((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  async function uploadQualityRows(
    ep,
    { silent = false, targetAnimeId = animeId, rethrow = false } = {},
  ) {
    if (!targetAnimeId) {
      setError('Сначала сохраните аниме (кнопка «Сохранить аниме»)')
      return 0
    }
    const rows = getUploadRows(ep.id).filter((r) => r.videoFile)
    if (!rows.length) {
      if (!silent) setError('Выберите файл хотя бы для одного качества')
      return 0
    }
    const seen = new Set()
    for (const row of rows) {
      if (seen.has(row.quality)) {
        setError(`Качество «${row.quality}» указано дважды — оставьте одну строку`)
        return 0
      }
      seen.add(row.quality)
    }
    const pKey = progressKeyExisting(ep.id)
    setUploadingEp(ep.id)
    patchUploadProgress(pKey, { percent: 0, phase: 'upload' })
    if (!silent) setError('')
    let uploaded = 0
    try {
      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i]
        await adminAddEpisodeSource(targetAnimeId, ep.id, row.quality, row.videoFile, {
          onProgress: (ev) => {
            patchUploadProgress(pKey, {
              phase: ev.phase,
              percent: mergeMultiFileProgress(i, rows.length, ev),
            })
          },
        })
        uploaded += 1
      }
      setUploadRowsFor(ep.id, [emptyUploadRow()])
      await refreshEpisodesOnly(targetAnimeId)
      if (!silent) setSuccess(`Загружено качеств: ${uploaded}`)
      return uploaded
    } catch (err) {
      setError(err.message)
      if (rethrow) throw err
      return 0
    } finally {
      setUploadingEp(null)
      clearUploadProgress(pKey)
    }
  }

  function episodeVideoPreview(animeKey, ep, localKey) {
    if (newVideoPreviews[localKey]) return newVideoPreviews[localKey]
    const path = episodePreviewSrc(animeKey, ep)
    return path ? mediaUrl(path) : null
  }

  function setSkipDraft(key, marks) {
    setSkipDrafts((prev) => ({ ...prev, [key]: marks }))
  }

  async function saveEpisodeSkipMarks(ep) {
    if (!animeId) {
      setError('Сначала сохраните аниме')
      return
    }
    const marks = skipDrafts[ep.id]
    if (!marks) return
    setSavingSkipEp(ep.id)
    setError('')
    try {
      const updated = await adminUpdateEpisode(animeId, ep.id, marks)
      patchExistingEpisode(ep.id, updated)
      setSkipDrafts((prev) => ({ ...prev, [ep.id]: episodeSkipFromEpisode(updated) }))
      setSuccess(`Метки OP/ED для серии ${ep.number} сохранены`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingSkipEp(null)
    }
  }

  async function uploadOneEpisode(targetId, ep, { onProgress } = {}) {
    const withFiles = (ep.qualities || []).filter((q) => q.videoFile)
    if (!withFiles.length) {
      throw new Error('Добавьте хотя бы одно видео (выберите качество и файл)')
    }
    const marks = skipDrafts[ep.localId] || {}
    await adminAddEpisode(
      targetId,
      { number: ep.number, title: ep.title, description: ep.description, ...marks },
      withFiles,
      { onProgress },
    )
  }

  async function saveSingleEpisode(ep) {
    if (!animeId) {
      setError('Сначала сохраните аниме (название и «Сохранить аниме»), затем загружайте серии')
      return
    }
    const pKey = progressKeyNew(ep.localId)
    setError('')
    setNewEpisodes((list) =>
      list.map((x) => (x.localId === ep.localId ? { ...x, status: 'uploading' } : x)),
    )
    patchUploadProgress(pKey, { percent: 0, phase: 'upload' })
    try {
      await uploadOneEpisode(animeId, ep, {
        onProgress: (ev) => patchUploadProgress(pKey, ev),
      })
      setNewEpisodes((list) => list.filter((x) => x.localId !== ep.localId))
      await refreshEpisodesOnly(animeId)
      setSuccess(`Серия ${ep.number} загружена`)
    } catch (err) {
      if (err.message.includes('Сессия')) {
        navigate('/admin/login', { replace: true })
        return
      }
      setNewEpisodes((list) =>
        list.map((x) => (x.localId === ep.localId ? { ...x, status: 'error' } : x)),
      )
      setError(err.message)
    } finally {
      clearUploadProgress(pKey)
    }
  }

  async function handleSave(e) {
    e.preventDefault()

    if (!title.trim()) {
      setError('Укажите название аниме')
      return
    }

    const episodesToUpload = newEpisodes.filter((ep) =>
      (ep.qualities || []).some((q) => q.videoFile),
    )

    const meta = payload()

    setSaving(true)
    setSuccess('')
    try {
      let savedId = animeId

      if (isNew || !savedId) {
        const created = await adminCreateAnime(meta)
        savedId = created.id
        setAnimeId(savedId)
        applyAnimeFromRecord({ ...created, episodes: [] })
      } else {
        const updated = await adminUpdateAnimeMeta(savedId, meta)
        applyMetaFromSaved(updated, meta)
      }

      if (posterFile) await adminUploadPoster(savedId, posterFile)
      if (backgroundFile) await adminUploadBackground(savedId, backgroundFile)

      for (const ep of existingEpisodes) {
        await adminUpdateEpisode(savedId, ep.id, {
          number: ep.number,
          title: ep.title,
          description: ep.description || '',
        })
      }

      const failed = []
      for (const ep of episodesToUpload) {
        const pKey = progressKeyNew(ep.localId)
        patchUploadProgress(pKey, { percent: 0, phase: 'upload' })
        try {
          await uploadOneEpisode(savedId, ep, {
            onProgress: (ev) => patchUploadProgress(pKey, ev),
          })
        } catch (err) {
          failed.push(ep)
          if (err.message.includes('Сессия')) throw err
        } finally {
          clearUploadProgress(pKey)
        }
      }

      setNewEpisodes(failed)
      setPosterFile(null)

      if (isNew && !failed.length) {
        navigate('/admin', {
          replace: true,
          state: { message: `«${title.trim()}» добавлено в каталог` },
        })
        return
      }

      try {
        await adminSyncDurations(savedId)
      } catch {
        /* длительность опциональна */
      }
      await refreshEpisodesOnly(savedId)
      window.dispatchEvent(new Event('anicatalog-reload'))

      const uploaded = episodesToUpload.length - failed.length
      const parts = ['Данные аниме сохранены']
      if (uploaded > 0) parts.push(`новых серий: ${uploaded}`)
      if (failed.length) parts.push(`не загружено серий: ${failed.length}`)
      setSuccess(parts.join(', '))
    } catch (err) {
      if (err.message.includes('Сессия')) {
        navigate('/admin/login', { replace: true })
        return
      }
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Удалить аниме и все файлы?')) return
    try {
      await adminDeleteAnime(animeId)
      window.dispatchEvent(new Event('anicatalog-reload'))
      navigate('/admin', { state: { message: 'Аниме удалено' } })
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return <p className="text-center text-[#9ca3af]">Загрузка…</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{isNew ? 'Новое аниме' : 'Редактирование'}</h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Метаданные сохраняются в базу, файлы — в папку anime/
        </p>
      </div>

      {!serverOk && (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          На порту 3001 старый или чужой процесс — тип и сезон не сохранятся. Остановите всё на
          3001, затем в папке <code className="text-amber-100">server</code> выполните:{' '}
          <code className="text-amber-100">npm run dev</code>. В{' '}
          <code className="text-amber-100">/api/health</code> должно быть{' '}
          <code className="text-amber-100">apiVersion: 2</code>.
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {success}
        </p>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        <section className="rounded-2xl border border-white/10 bg-[#141820]/60 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-lg font-semibold">Основное</h2>
          <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
            <div>
              <p className="mb-2 text-sm text-[#9ca3af]">Постер</p>
              <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-dashed border-white/20 bg-[#0b0e14]">
                {coverUrl && !posterFile && (
                  <img src={coverUrl} alt="" className="h-full w-full object-cover" />
                )}
                {posterFile && (
                  <img
                    src={URL.createObjectURL(posterFile)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
                {!coverUrl && !posterFile && (
                  <div className="flex h-full items-center justify-center text-xs text-[#6b7280]">
                    Нет постера
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPosterFile(e.target.files?.[0] || null)}
                className="mt-2 w-full text-xs text-[#9ca3af] file:mr-2 file:rounded-lg file:border-0 file:bg-[#c4b5fd] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#1e1b4b]"
              />
              <p className="mb-2 mt-4 text-sm text-[#9ca3af]">Фон страницы (видео без звука)</p>
              {(backgroundVideoUrl || backgroundFile) && (
                <video
                  src={backgroundFile ? URL.createObjectURL(backgroundFile) : backgroundVideoUrl}
                  className="mb-2 aspect-video w-full rounded-lg border border-white/10 object-cover"
                  muted
                  loop
                  playsInline
                  autoPlay
                />
              )}
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setBackgroundFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-[#9ca3af] file:mr-2 file:rounded-lg file:border-0 file:bg-[#c4b5fd] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#1e1b4b]"
              />
            </div>

            <div className="space-y-4">
              <Field label="Название *">
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputClass}
                  placeholder="Название аниме"
                />
              </Field>
              <Field label="Тип">
                <div className="flex flex-wrap gap-2">
                  {ANIME_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setAnimeType(t.value)}
                      className={chipBtnClass(animeType === t.value)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Сезон выхода">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSeason('')}
                    className={chipBtnClass(!season)}
                  >
                    Не указан
                  </button>
                  {ANIME_SEASONS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setSeason(s.value)}
                      className={chipBtnClass(season === s.value)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Год выхода">
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className={inputClass}
                  placeholder="2026"
                />
              </Field>
              <Field label="Возрастной рейтинг">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAgeRating('')}
                    className={chipBtnClass(!ageRating)}
                  >
                    Не указан
                  </button>
                  {AGE_RATING_OPTIONS.map((age) => (
                    <button
                      key={age}
                      type="button"
                      onClick={() => setAgeRating(age)}
                      className={chipBtnClass(ageRating === age)}
                    >
                      {age}
                    </button>
                  ))}
                </div>
              </Field>
              {!isNew && existingEpisodes.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-[#0b0e14]/50 px-4 py-3 text-sm text-[#9ca3af]">
                  <p>
                    <span className="text-[#6b7280]">Длительность серии: </span>
                    <span className="text-white">
                      {watchStats.episodeDurationSeconds
                        ? formatDurationRu(watchStats.episodeDurationSeconds)
                        : 'запустите серию в плеере или установите ffprobe'}
                    </span>
                    {watchStats.knownCount > 0 && (
                      <span className="text-[#6b7280]">
                        {' '}
                        (по {watchStats.knownCount} из {existingEpisodes.length})
                      </span>
                    )}
                  </p>
                  <p className="mt-1">
                    <span className="text-[#6b7280]">Общее время ({existingEpisodes.length}{' '}
                    сер.): </span>
                    <span className="text-white">
                      {watchStats.totalWatchSeconds
                        ? formatDurationRu(watchStats.totalWatchSeconds)
                        : '—'}
                    </span>
                  </p>
                </div>
              )}
              <Field label="Описание">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className={inputClass}
                  placeholder="Краткое описание"
                />
              </Field>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#141820]/60 p-6">
          <h2 className="mb-4 text-lg font-semibold">Жанры и категории</h2>
          <div className="mb-4 flex flex-wrap gap-2">
            {ADMIN_GENRES.map((g) => {
              const on = genres.includes(g)
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGenre(g)}
                  className={`rounded-full px-3 py-1.5 text-sm transition ${
                    on
                      ? 'bg-[#c4b5fd] text-[#1e1b4b]'
                      : 'border border-white/10 text-[#9ca3af] hover:border-[#c4b5fd]/40'
                  }`}
                >
                  {genreLabel(g)}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-4">
            {[
              ['Новинка', isNewFlag, setIsNewFlag],
              ['Популярное', isPopular, setIsPopular],
              ['Рекомендуемое', isRecommended, setIsRecommended],
            ].map(([label, val, set]) => (
              <label
                key={label}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm"
              >
                <input
                  type="checkbox"
                  checked={val}
                  onChange={(e) => set(e.target.checked)}
                  className="accent-[#c4b5fd]"
                />
                {label}
              </label>
            ))}
          </div>
        </section>

        {!isNew && existingEpisodes.length > 0 && (
          <section className="rounded-2xl border border-white/10 bg-[#141820]/60 p-6">
            <h2 className="mb-1 text-lg font-semibold">Серии ({existingEpisodes.length})</h2>
            <p className="mb-4 text-xs text-[#6b7280]">
              Номер и название серий сохраняются по кнопке «Сохранить аниме», не при вводе.
            </p>
            <ul className="space-y-3">
              {existingEpisodes.map((ep) => (
                <li
                  key={ep.id}
                  className="rounded-xl border border-white/5 bg-[#0b0e14]/50 p-4"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#6b7280]">
                    <span>
                      {episodeSourcesList(ep)
                        .map((s) => s.quality)
                        .join(', ') || 'нет видео'}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm('Удалить серию?')) return
                        try {
                          await adminDeleteEpisode(animeId, ep.id)
                          setExistingEpisodes((l) => l.filter((x) => x.id !== ep.id))
                        } catch (err) {
                          setError(err.message)
                        }
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      Удалить
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      type="number"
                      value={ep.number ?? ''}
                      onChange={(e) =>
                        patchExistingEpisode(ep.id, { number: Number(e.target.value) || 1 })
                      }
                      className={inputClass}
                      placeholder="№"
                    />
                    <input
                      value={ep.title ?? ''}
                      onChange={(e) => patchExistingEpisode(ep.id, { title: e.target.value })}
                      className={inputClass}
                      placeholder="Название"
                    />
                  </div>
                  <div className="mt-3 space-y-3 rounded-lg border border-white/5 p-3">
                    <p className="text-xs font-medium text-[#9ca3af]">Загруженные качества</p>
                    {episodeSourcesList(ep).length === 0 ? (
                      <p className="text-xs text-[#6b7280]">Пока нет файлов</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {episodeSourcesList(ep).map((s) => (
                          <li
                            key={s.quality}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#0b0e14]/60 px-2 py-1.5 text-xs"
                          >
                            <span className="font-medium text-[#c4b5fd]">{s.quality}</span>
                            <span className="max-w-[min(100%,280px)] truncate text-[#6b7280]">
                              {s.file}
                            </span>
                            <button
                              type="button"
                              className="shrink-0 text-red-400 hover:text-red-300"
                              onClick={async () => {
                                if (!confirm(`Удалить качество ${s.quality}?`)) return
                                try {
                                  await adminRemoveEpisodeSource(animeId, ep.id, s.quality)
                                  setSuccess(`Качество ${s.quality} удалено`)
                                  await refreshEpisodesOnly(animeId)
                                } catch (err) {
                                  setError(err.message)
                                }
                              }}
                            >
                              Удалить
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    <p className="pt-1 text-xs font-medium text-[#c4b5fd]">
                      Загрузить видео для разных качеств
                    </p>
                    {getUploadRows(ep.id).map((row, ri) => (
                      <div
                        key={row.rowId}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-white/5 bg-[#0b0e14]/40 p-2"
                      >
                        <select
                          value={row.quality}
                          onChange={(e) =>
                            setUploadRowsFor(
                              ep.id,
                              getUploadRows(ep.id).map((r, j) =>
                                j === ri ? { ...r, quality: e.target.value } : r,
                              ),
                            )
                          }
                          className={`${inputClass} max-w-[120px] py-1.5 text-sm`}
                        >
                          {QUALITY_PRESETS.map((q) => (
                            <option key={q} value={q}>
                              {q}
                            </option>
                          ))}
                          <option value="Оригинал">Оригинал</option>
                        </select>
                        <label className="cursor-pointer rounded-lg bg-[#c4b5fd] px-2.5 py-1 text-xs font-semibold text-[#1e1b4b]">
                          Выбрать MP4
                          <input
                            type="file"
                            accept="video/mp4,video/*,.mp4"
                            className="sr-only"
                            onChange={(e) => {
                              const f = e.target.files?.[0] || null
                              setUploadRowsFor(
                                ep.id,
                                getUploadRows(ep.id).map((r, j) =>
                                  j === ri ? { ...r, videoFile: f } : r,
                                ),
                              )
                              e.target.value = ''
                            }}
                          />
                        </label>
                        <span className="max-w-[180px] truncate text-xs text-[#9ca3af]">
                          {row.videoFile?.name || 'файл не выбран'}
                        </span>
                        {getUploadRows(ep.id).length > 1 && (
                          <button
                            type="button"
                            className="text-xs text-red-400"
                            onClick={() =>
                              setUploadRowsFor(
                                ep.id,
                                getUploadRows(ep.id).filter((_, j) => j !== ri),
                              )
                            }
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="text-xs text-[#c4b5fd] hover:underline"
                        onClick={() =>
                          setUploadRowsFor(ep.id, [...getUploadRows(ep.id), emptyUploadRow()])
                        }
                      >
                        + Добавить качество
                      </button>
                      <button
                        type="button"
                        disabled={uploadingEp === ep.id}
                        onClick={() => uploadQualityRows(ep)}
                        className="rounded-lg bg-[#c4b5fd] px-4 py-1.5 text-xs font-semibold text-[#1e1b4b] disabled:opacity-50"
                      >
                        {uploadingEp === ep.id
                          ? uploadProgress[progressKeyExisting(ep.id)]?.percent != null
                            ? `Загрузка ${uploadProgress[progressKeyExisting(ep.id)].percent}%`
                            : 'Загрузка…'
                          : 'Загрузить выбранные'}
                      </button>
                    </div>
                    <EpisodeUploadProgress progress={uploadProgress[progressKeyExisting(ep.id)]} />
                  </div>

                  {episodeVideoPreview(animeId, ep) && (
                    <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                      <p className="text-xs font-medium text-[#c4b5fd]">Опенинг и эндинг (для всех качеств)</p>
                      <EpisodeSkipEditor
                        videoSrc={episodeVideoPreview(animeId, ep)}
                        value={skipDrafts[ep.id] || episodeSkipFromEpisode(ep)}
                        onChange={(marks) => setSkipDraft(ep.id, marks)}
                        disabled={savingSkipEp === ep.id}
                      />
                      <button
                        type="button"
                        disabled={savingSkipEp === ep.id}
                        onClick={() => saveEpisodeSkipMarks(ep)}
                        className="rounded-lg border border-accent/40 bg-accent/15 px-4 py-2 text-xs font-semibold text-[#ede9fe] hover:bg-accent/25 disabled:opacity-50"
                      >
                        {savingSkipEp === ep.id ? 'Сохранение…' : 'Сохранить OP/ED'}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-2xl border border-white/10 bg-[#141820]/60 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Добавить серии</h2>
            <button
              type="button"
              onClick={() =>
                setNewEpisodes((eps) => [...eps, emptyEpisode(eps.length + existingEpisodes.length + 1)])
              }
              className="rounded-lg bg-[#c4b5fd]/15 px-4 py-2 text-sm font-medium text-[#c4b5fd] transition hover:bg-[#c4b5fd]/25"
            >
              + Серия
            </button>
          </div>
          {newEpisodes.length === 0 && (
            <p className="text-sm text-[#6b7280]">
              Для каждой серии можно добавить несколько качеств (1080p, 720p…). Пустые строки
              качеств не загружаются.
            </p>
          )}
          {!animeId && newEpisodes.some((ep) => (ep.qualities || []).some((q) => q.videoFile)) && (
            <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              Для нового аниме сначала нажмите «Сохранить аниме» (создаст запись), затем можно
              загружать серии по одной.
            </p>
          )}
          {newEpisodes.map((ep, i) => (
            <div
              key={ep.localId}
              className={`mb-3 rounded-xl border p-4 ${
                ep.status === 'error'
                  ? 'border-red-500/40 bg-red-500/5'
                  : 'border-white/5 bg-[#0b0e14]/50'
              }`}
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-[#9ca3af]">Серия {i + 1}</span>
                <button
                  type="button"
                  onClick={() =>
                    setNewEpisodes((list) => list.filter((x) => x.localId !== ep.localId))
                  }
                  className="text-xs text-red-400"
                >
                  Убрать
                </button>
              </div>
              <p className="mb-2 text-xs font-medium text-[#c4b5fd]">Видео по качествам</p>
              {(ep.qualities || []).map((q, qi) => (
                <div
                  key={qi}
                  className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-white/5 p-2"
                >
                  <select
                    value={q.quality}
                    onChange={(e) =>
                      setNewEpisodes((list) =>
                        list.map((x) =>
                          x.localId === ep.localId
                            ? {
                                ...x,
                                qualities: x.qualities.map((qq, j) =>
                                  j === qi ? { ...qq, quality: e.target.value } : qq,
                                ),
                              }
                            : x,
                        ),
                      )
                    }
                    className={`${inputClass} max-w-[130px] py-1.5 text-sm`}
                  >
                    {QUALITY_PRESETS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                    <option value="Оригинал">Оригинал</option>
                  </select>
                  <label className="cursor-pointer rounded-lg bg-[#c4b5fd] px-2 py-1 text-xs font-semibold text-[#1e1b4b]">
                    Файл
                    <input
                      type="file"
                      accept="video/*"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null
                        if (f) {
                          setNewVideoPreviews((prev) => {
                            if (prev[ep.localId]) URL.revokeObjectURL(prev[ep.localId])
                            return { ...prev, [ep.localId]: URL.createObjectURL(f) }
                          })
                          if (!skipDrafts[ep.localId]) {
                            setSkipDraft(ep.localId, episodeSkipFromEpisode({}))
                          }
                        }
                        setNewEpisodes((list) =>
                          list.map((x) =>
                            x.localId === ep.localId
                              ? {
                                  ...x,
                                  qualities: x.qualities.map((qq, j) =>
                                    j === qi ? { ...qq, videoFile: f } : qq,
                                  ),
                                }
                              : x,
                          ),
                        )
                      }}
                    />
                  </label>
                  <span className="max-w-[200px] truncate text-xs text-[#9ca3af]">
                    {q.videoFile?.name || 'не выбран'}
                  </span>
                  {(ep.qualities?.length ?? 0) > 1 && (
                    <button
                      type="button"
                      className="text-xs text-red-400"
                      onClick={() =>
                        setNewEpisodes((list) =>
                          list.map((x) =>
                            x.localId === ep.localId
                              ? {
                                  ...x,
                                  qualities: x.qualities.filter((_, j) => j !== qi),
                                }
                              : x,
                          ),
                        )
                      }
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="mb-3 text-xs text-[#c4b5fd] hover:underline"
                onClick={() =>
                  setNewEpisodes((list) =>
                    list.map((x) =>
                      x.localId === ep.localId
                        ? { ...x, qualities: [...(x.qualities || []), emptyQuality()] }
                        : x,
                    ),
                  )
                }
              >
                + Добавить качество
              </button>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="number"
                  value={ep.number}
                  onChange={(e) =>
                    setNewEpisodes((list) =>
                      list.map((x) =>
                        x.localId === ep.localId
                          ? { ...x, number: Number(e.target.value) }
                          : x,
                      ),
                    )
                  }
                  className={inputClass}
                />
                <input
                  value={ep.title}
                  onChange={(e) =>
                    setNewEpisodes((list) =>
                      list.map((x) =>
                        x.localId === ep.localId ? { ...x, title: e.target.value } : x,
                      ),
                    )
                  }
                  className={inputClass}
                  placeholder="Название серии"
                />
              </div>
              {newVideoPreviews[ep.localId] && (
                <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                  <p className="text-xs font-medium text-[#c4b5fd]">
                    Отметьте опенинг/эндинг до загрузки (применится ко всем качествам)
                  </p>
                  <EpisodeSkipEditor
                    videoSrc={newVideoPreviews[ep.localId]}
                    value={skipDrafts[ep.localId] || episodeSkipFromEpisode({})}
                    onChange={(marks) => setSkipDraft(ep.localId, marks)}
                  />
                </div>
              )}

              {animeId && (
                <>
                  <button
                    type="button"
                    disabled={
                      !(ep.qualities || []).some((q) => q.videoFile) || ep.status === 'uploading'
                    }
                    onClick={() => saveSingleEpisode(ep)}
                    className="mt-3 rounded-lg border border-[#c4b5fd]/40 bg-[#c4b5fd]/10 px-4 py-2 text-sm font-medium text-[#c4b5fd] transition hover:bg-[#c4b5fd]/20 disabled:opacity-40"
                  >
                    {ep.status === 'uploading'
                      ? uploadProgress[progressKeyNew(ep.localId)]?.percent != null
                        ? `Загрузка ${uploadProgress[progressKeyNew(ep.localId)].percent}%`
                        : 'Загрузка…'
                      : 'Загрузить эту серию'}
                  </button>
                  <EpisodeUploadProgress progress={uploadProgress[progressKeyNew(ep.localId)]} />
                </>
              )}
            </div>
          ))}
        </section>

        <div className="flex flex-wrap gap-3 border-t border-white/10 pt-6">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#c4b5fd] px-8 py-3 text-sm font-semibold text-[#1e1b4b] shadow-lg shadow-[#c4b5fd]/20 transition hover:bg-[#ddd6fe] disabled:opacity-50"
          >
            {saving ? 'Сохранение…' : 'Сохранить аниме'}
          </button>
          <Link
            to="/admin"
            className="rounded-xl border border-white/10 px-6 py-3 text-sm text-[#9ca3af] transition hover:text-white"
          >
            Отмена
          </Link>
          {!isNew && (
            <button
              type="button"
              onClick={handleDelete}
              className="ml-auto rounded-xl border border-red-500/40 px-6 py-3 text-sm text-red-400 transition hover:bg-red-500/10"
            >
              Удалить
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
