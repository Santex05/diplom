import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  adminBulkDeleteHomeBanners,
  adminCreateHomeBanner,
  adminDeleteHomeBanner,
  adminFetchAnime,
  adminFetchHomeBanners,
  adminReorderHomeBanners,
  adminUpdateHomeBanner,
  adminUploadBannerImage,
  mediaUrl,
} from '../../api'
import BannerMedia from '../../components/BannerMedia'
import AdminBulkToolbar from '../../components/admin/AdminBulkToolbar'
import { BannerEditorPreview, BannerGridCard, BannerOrderList } from '../../components/admin/BannerPreview'
import { useAdminBulkSelect } from '../../hooks/useAdminBulkSelect'
import { animeCoverPath, bannerMediaPath } from '../../utils/bannerMedia'

const ANIME_BUTTONS = [
  { id: 'watch', kind: 'watch', label: 'Смотреть', enabled: true },
  { id: 'details', kind: 'details', label: 'Подробнее', enabled: true },
  { id: 'queue', kind: 'queue', label: 'В очередь', enabled: true },
  { id: 'favorite', kind: 'favorite', label: 'Избранное', enabled: true },
  { id: 'collection', kind: 'collection', label: 'В списки', enabled: true },
]

const CUSTOM_BUTTON_KINDS = [
  { kind: 'link', label: 'Внешняя ссылка' },
  { kind: 'route', label: 'Страница на сайте' },
]

const HOME_BANNER_PUBLIC_LIMIT = 24

const FILTER_TABS = [
  { id: 'all', label: 'Все баннеры' },
  { id: 'anime', label: 'Только аниме' },
  { id: 'custom', label: 'Только кастомные' },
  { id: 'order', label: 'Порядок' },
]

const inputCls =
  'mt-1 w-full rounded-xl border border-white/10 bg-[#0b0e14] px-3 py-2.5 text-sm text-white placeholder:text-[#6b7280] focus:border-[#c4b5fd]/40 focus:outline-none'

function emptyForm() {
  return {
    type: 'anime',
    animeId: '',
    title: '',
    description: '',
    tags: '',
    enabled: true,
    buttons: [...ANIME_BUTTONS],
    customButtons: [{ id: 'link-1', kind: 'link', label: 'Перейти', url: '', enabled: true }],
  }
}

function slideToForm(slide) {
  const customButtons = (slide.buttons || []).filter((b) => b.kind === 'link' || b.kind === 'route')
  return {
    type: slide.type === 'custom' ? 'custom' : 'anime',
    animeId: slide.animeId || '',
    title: slide.title || '',
    description: slide.description || '',
    tags: (slide.tags || []).join(', '),
    enabled: slide.enabled !== false,
    buttons: slide.buttons?.length
      ? slide.buttons.filter((b) => b.kind !== 'link' && b.kind !== 'route')
      : [...ANIME_BUTTONS],
    customButtons: customButtons.length
      ? customButtons
      : [{ id: 'link-1', kind: 'link', label: 'Перейти', url: '', enabled: true }],
  }
}

function resolveSlidePreview(slide, animeList, form) {
  const anime = animeList.find((a) => a.id === (form?.animeId || slide.animeId))
  let tags = form?.tags
    ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
    : [...(slide.tags || [])]
  if (!tags.length && slide.type === 'anime' && anime) {
    tags = [
      ...(anime.categories?.isNew ? ['Новинка'] : []),
      ...(anime.genres?.slice(0, 2) ?? []),
    ]
  }

  let title = form?.title ?? slide.title
  let description = form?.description ?? slide.description
  if (slide.type === 'anime' && anime) {
    if (!title?.trim()) title = anime.title
    if (!description?.trim()) description = anime.description || ''
  }

  let mediaSrc = null
  let mediaFallbackSrc = null
  const bannerPath = bannerMediaPath(slide)
  const animeCover = animeCoverPath(anime)
  if (bannerPath) {
    mediaSrc = mediaUrl(bannerPath)
    if (slide.type === 'anime' && animeCover) {
      mediaFallbackSrc = mediaUrl(animeCover)
    }
  } else if (slide.type === 'anime' && animeCover) {
    mediaSrc = mediaUrl(animeCover)
  }

  const buttons =
    (form?.type || slide.type) === 'anime'
      ? form?.buttons || slide.buttons
      : form?.customButtons || slide.buttons

  return { title, description, tags, mediaSrc, mediaFallbackSrc, buttons }
}

export default function AdminHomeBanners() {
  const [slides, setSlides] = useState([])
  const [animeList, setAnimeList] = useState([])
  const [filter, setFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState(null)
  const [forceMediaSrc, setForceMediaSrc] = useState(null)
  const fileRef = useRef(null)
  const blobRef = useRef(null)

  const revokeBlob = useCallback(() => {
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current)
      blobRef.current = null
    }
  }, [])

  useEffect(() => () => revokeBlob(), [revokeBlob])

  useEffect(() => {
    setForceMediaSrc(null)
    revokeBlob()
    setPendingPreviewUrl(null)
  }, [selectedId, revokeBlob])

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    Promise.all([adminFetchHomeBanners(), adminFetchAnime()])
      .then(([bannerSlides, anime]) => {
        setSlides(bannerSlides)
        setAnimeList(anime)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const enabledOnHomeCount = useMemo(
    () => slides.filter((s) => s.enabled !== false).length,
    [slides],
  )

  const homeSlotsFull = enabledOnHomeCount >= HOME_BANNER_PUBLIC_LIMIT

  const filteredSlides = useMemo(() => {
    if (filter === 'order') return slides
    if (filter === 'anime') return slides.filter((s) => s.type === 'anime')
    if (filter === 'custom') return slides.filter((s) => s.type === 'custom')
    return slides
  }, [slides, filter])

  const listForBulk = filter === 'order' ? slides : filteredSlides
  const bulk = useAdminBulkSelect(listForBulk)

  const deleteSelected = async () => {
    if (bulk.count === 0) return
    if (
      !window.confirm(
        `Удалить ${bulk.count} баннеров? Медиафайлы баннеров также будут удалены. Это нельзя отменить.`,
      )
    ) {
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const { deleted, failed } = await adminBulkDeleteHomeBanners(bulk.selectedIds)
      if (selectedId && bulk.isSelected(selectedId)) {
        closeEditor()
      }
      bulk.clear()
      await load()
      if (failed?.length) {
        setError(`Удалено: ${deleted.length}. Ошибки: ${failed.length}`)
      } else {
        setMessage(`Удалено баннеров: ${deleted.length}`)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const moveSlide = async (id, direction) => {
    const idx = slides.findIndex((s) => s.id === id)
    const target = idx + direction
    if (idx < 0 || target < 0 || target >= slides.length) return
    setSaving(true)
    setError('')
    try {
      const ids = slides.map((s) => s.id)
      ;[ids[idx], ids[target]] = [ids[target], ids[idx]]
      const reordered = await adminReorderHomeBanners(ids)
      setSlides(reordered)
      setMessage('Порядок обновлён')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const selected = slides.find((s) => s.id === selectedId)

  const openEditor = (slide) => {
    setSelectedId(slide.id)
    setForm(slideToForm(slide))
    setMessage('')
    setError('')
  }

  const closeEditor = () => {
    setSelectedId(null)
    setForm(emptyForm())
  }

  const createNew = async (type = 'anime') => {
    setSaving(true)
    setError('')
    try {
      const slide = await adminCreateHomeBanner({
        type,
        enabled: false,
        buttons: type === 'anime' ? ANIME_BUTTONS : [],
      })
      await load()
      openEditor(slide)
      setMessage('Баннер создан — заполните поля и опубликуйте')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const pickAnime = (animeId) => {
    const anime = animeList.find((a) => a.id === animeId)
    if (!anime) {
      setForm((f) => ({ ...f, animeId: '' }))
      return
    }
    const tags = [
      ...(anime.categories?.isNew ? ['Новинка'] : []),
      ...(anime.genres?.slice(0, 2) ?? []),
    ]
    setForm((f) => ({
      ...f,
      animeId,
      type: 'anime',
      title: anime.title,
      description: anime.description || '',
      tags: tags.join(', '),
      buttons: f.buttons?.length ? f.buttons : [...ANIME_BUTTONS],
    }))
  }

  const save = async () => {
    if (!selectedId) return
    setSaving(true)
    setError('')
    try {
      const tags = form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      let buttons = form.buttons
      if (form.type === 'custom') {
        buttons = form.customButtons.filter((b) => b.url?.trim() || b.label?.trim())
      }

      await adminUpdateHomeBanner(selectedId, {
        type: form.type,
        animeId: form.type === 'anime' ? form.animeId || null : null,
        title: form.title,
        description: form.description,
        tags,
        enabled: form.enabled,
        buttons,
      })
      await load()
      setMessage(form.enabled ? 'Баннер сохранён и опубликован' : 'Баннер сохранён как черновик')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    if (!window.confirm('Удалить баннер?')) return
    setSaving(true)
    try {
      await adminDeleteHomeBanner(id)
      if (selectedId === id) closeEditor()
      await load()
      setMessage('Баннер удалён')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const uploadMedia = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !selectedId) return

    revokeBlob()
    const blobUrl = URL.createObjectURL(file)
    blobRef.current = blobUrl
    setPendingPreviewUrl(blobUrl)
    setForceMediaSrc(null)
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const updated = await adminUploadBannerImage(selectedId, file)
      let nextSlide = null
      setSlides((prev) =>
        prev.map((s) => {
          if (s.id !== selectedId) return s
          nextSlide = { ...s, ...updated }
          return nextSlide
        }),
      )
      const serverSrc = updated.imageUrl
        ? mediaUrl(updated.imageUrl)
        : nextSlide
          ? mediaUrl(bannerMediaPath(nextSlide) || '')
          : ''
      if (serverSrc) setForceMediaSrc(serverSrc)
      revokeBlob()
      setPendingPreviewUrl(null)
      setMessage(/\.(mp4|webm|ogg|mov)$/i.test(file.name) ? 'Видео загружено' : 'Изображение загружено')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
      e.target.value = ''
    }
  }

  const toggleAnimeBtn = (kind) => {
    setForm((f) => ({
      ...f,
      buttons: f.buttons.map((b) => (b.kind === kind ? { ...b, enabled: !b.enabled } : b)),
    }))
  }

  const patchCustomButton = (id, patch) => {
    setForm((f) => ({
      ...f,
      customButtons: f.customButtons.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }))
  }

  const addCustomButton = () => {
    setForm((f) => ({
      ...f,
      customButtons: [
        ...f.customButtons,
        {
          id: `link-${Date.now()}`,
          kind: 'link',
          label: 'Кнопка',
          url: '',
          enabled: true,
        },
      ],
    }))
  }

  const removeCustomButton = (id) => {
    setForm((f) => ({
      ...f,
      customButtons: f.customButtons.filter((b) => b.id !== id),
    }))
  }

  const preview = selected ? resolveSlidePreview(selected, animeList, form) : null
  const editorMediaSrc =
    pendingPreviewUrl || forceMediaSrc || preview?.mediaSrc || preview?.mediaFallbackSrc || null

  if (selected) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={closeEditor}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-[#9ca3af] hover:border-white/20 hover:text-white"
          >
            ← К списку баннеров
          </button>
          <h1 className="text-xl font-bold">Редактор баннера</h1>
        </div>

        {message && (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="space-y-5 rounded-2xl border border-white/10 bg-[#141820]/60 p-5">
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  fileRef.current?.click()
                }
              }}
              className="group relative aspect-[21/9] w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-white/15 bg-[#0b0e14] transition hover:border-[#c4b5fd]/40"
            >
              {editorMediaSrc || preview?.mediaFallbackSrc ? (
                <BannerMedia
                  src={editorMediaSrc || preview?.mediaSrc}
                  fallbackSrc={forceMediaSrc || pendingPreviewUrl ? null : preview?.mediaFallbackSrc}
                  alt={preview?.title}
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-[#9ca3af]">
                  Фото / видео баннера
                </span>
              )}
              {saving && (
                <span className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 text-sm text-white">
                  Загрузка…
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-sm font-medium text-white opacity-0 transition group-hover:bg-black/50 group-hover:opacity-100">
                Нажмите, чтобы загрузить
              </span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/ogg,video/quicktime"
              className="hidden"
              onChange={uploadMedia}
            />
            <p className="text-xs text-[#6b7280]">
              JPG, PNG, WebP или MP4/WebM до 100 МБ. Для аниме без загрузки используется постер релиза.
            </p>

            <div className="flex flex-wrap gap-4 border-y border-white/10 py-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={form.type === 'anime'}
                  onChange={() =>
                    setForm((f) => ({ ...f, type: 'anime', buttons: [...ANIME_BUTTONS] }))
                  }
                />
                Баннер аниме
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={form.type === 'custom'}
                  onChange={() => setForm((f) => ({ ...f, type: 'custom', animeId: '' }))}
                />
                Кастомный баннер
              </label>
            </div>

            {form.type === 'anime' && (
              <label className="block text-sm">
                <span className="text-[#9ca3af]">Аниме — подставит название, описание и теги</span>
                <select
                  value={form.animeId}
                  onChange={(e) => pickAnime(e.target.value)}
                  className={inputCls}
                >
                  <option value="">— выберите аниме —</option>
                  {animeList.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block text-sm">
              <span className="text-[#9ca3af]">Название</span>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Название баннера"
                className={inputCls}
              />
            </label>

            <label className="block text-sm">
              <span className="text-[#9ca3af]">Описание</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={4}
                placeholder="Краткое описание для баннера"
                className={inputCls}
              />
            </label>

            <label className="block text-sm">
              <span className="text-[#9ca3af]">Теги через запятую</span>
              <input
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="Новинка, Комедия"
                className={inputCls}
              />
            </label>

            {form.type === 'anime' ? (
              <div>
                <p className="mb-3 text-sm text-[#9ca3af]">Кнопки на баннере</p>
                <div className="flex flex-wrap gap-2">
                  {ANIME_BUTTONS.map(({ kind, label }) => {
                    const on = form.buttons.find((b) => b.kind === kind)?.enabled !== false
                    return (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => toggleAnimeBtn(kind)}
                        className={`rounded-xl border px-3 py-2 text-sm transition ${
                          on
                            ? 'border-[#c4b5fd]/50 bg-[#c4b5fd]/15 text-[#ddd6fe]'
                            : 'border-white/10 text-[#9ca3af]'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#9ca3af]">Кнопки</p>
                  <button
                    type="button"
                    onClick={addCustomButton}
                    className="text-sm text-[#c4b5fd] hover:underline"
                  >
                    + Добавить кнопку
                  </button>
                </div>
                {form.customButtons.map((btn) => (
                  <div
                    key={btn.id}
                    className="grid gap-2 rounded-xl border border-white/10 bg-[#0b0e14]/60 p-3 sm:grid-cols-2"
                  >
                    <label className="block text-xs">
                      <span className="text-[#6b7280]">Тип</span>
                      <select
                        value={btn.kind}
                        onChange={(e) => patchCustomButton(btn.id, { kind: e.target.value })}
                        className={inputCls}
                      >
                        {CUSTOM_BUTTON_KINDS.map((k) => (
                          <option key={k.kind} value={k.kind}>
                            {k.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-xs">
                      <span className="text-[#6b7280]">Текст кнопки</span>
                      <input
                        value={btn.label}
                        onChange={(e) => patchCustomButton(btn.id, { label: e.target.value })}
                        className={inputCls}
                      />
                    </label>
                    <label className="block text-xs sm:col-span-2">
                      <span className="text-[#6b7280]">
                        {btn.kind === 'route' ? 'Путь на сайте (например /catalog)' : 'URL (https://…)'}
                      </span>
                      <input
                        value={btn.url}
                        onChange={(e) => patchCustomButton(btn.id, { url: e.target.value })}
                        placeholder={btn.kind === 'route' ? '/catalog' : 'https://t.me/...'}
                        className={inputCls}
                      />
                    </label>
                    <div className="flex items-center justify-between sm:col-span-2">
                      <label className="flex items-center gap-2 text-xs text-[#9ca3af]">
                        <input
                          type="checkbox"
                          checked={btn.enabled !== false}
                          onChange={(e) => patchCustomButton(btn.id, { enabled: e.target.checked })}
                        />
                        Показывать
                      </label>
                      {form.customButtons.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCustomButton(btn.id)}
                          className="text-xs text-red-300 hover:underline"
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 border-t border-white/10 pt-4">
              <label
                className={`flex items-center gap-2 text-sm ${
                  homeSlotsFull && !form.enabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.enabled}
                  disabled={homeSlotsFull && !selected?.enabled}
                  onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                  className="h-4 w-4 rounded"
                />
                Опубликовать на главной
              </label>
              {homeSlotsFull && !selected?.enabled && (
                <p className="text-xs text-amber-300">
                  Лимит {HOME_BANNER_PUBLIC_LIMIT} баннеров — отключите другой, чтобы опубликовать этот.
                </p>
              )}
              <div className="ml-auto flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={save}
                  className="rounded-xl bg-[#c4b5fd] px-5 py-2.5 text-sm font-semibold text-[#1e1b4b] hover:bg-[#ddd6fe] disabled:opacity-50"
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => remove(selected.id)}
                  className="rounded-xl border border-red-400/40 px-4 py-2.5 text-sm text-red-300"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>

          <aside className="space-y-3 xl:sticky xl:top-6 xl:self-start">
            <p className="text-sm font-medium text-[#9ca3af]">Превью на главной</p>
            <BannerEditorPreview
              mediaSrc={editorMediaSrc}
              mediaFallbackSrc={forceMediaSrc || pendingPreviewUrl ? null : preview?.mediaFallbackSrc}
              title={preview?.title}
              description={preview?.description}
              tags={preview?.tags}
              buttons={preview?.buttons}
              type={form.type}
            />
          </aside>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Баннеры главной</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">
            Управление слайдами на главной. На главной показывается до {HOME_BANNER_PUBLIC_LIMIT}{' '}
            опубликованных баннеров (по порядку).
          </p>
          <p
            className={`mt-1 text-xs font-medium ${
              homeSlotsFull ? 'text-amber-300' : 'text-[#6b7280]'
            }`}
          >
            Опубликовано: {enabledOnHomeCount} / {HOME_BANNER_PUBLIC_LIMIT}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => createNew('anime')}
            className="rounded-xl border border-[#c4b5fd]/40 px-4 py-2.5 text-sm font-medium text-[#ddd6fe] hover:bg-[#c4b5fd]/10 disabled:opacity-50"
          >
            + Баннер аниме
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => createNew('custom')}
            className="rounded-xl bg-[#c4b5fd] px-4 py-2.5 text-sm font-semibold text-[#1e1b4b] hover:bg-[#ddd6fe] disabled:opacity-50"
          >
            + Кастомный баннер
          </button>
        </div>
      </div>

      {message && (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {!loading && slides.length > 0 && (
        <AdminBulkToolbar
          total={bulk.total}
          count={bulk.count}
          allSelected={bulk.allSelected}
          onSelectAll={bulk.selectAll}
          onClear={bulk.clear}
          onDelete={deleteSelected}
          deleting={saving}
          itemLabel="баннеров"
        />
      )}

      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              filter === tab.id
                ? 'bg-[#c4b5fd] text-[#1e1b4b]'
                : 'border border-white/10 text-[#9ca3af] hover:border-white/20 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[#9ca3af]">Загрузка…</p>
      ) : filter === 'order' ? (
        <BannerOrderList
          slides={slides}
          getPreview={(slide) => resolveSlidePreview(slide, animeList, null)}
          onMove={moveSlide}
          onEdit={openEditor}
          saving={saving}
          isBulkSelected={bulk.isSelected}
          onBulkToggle={bulk.toggle}
        />
      ) : filteredSlides.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 py-16 text-center text-[#9ca3af]">
          {filter === 'all' ? 'Баннеров пока нет' : 'Нет баннеров в этой категории'}
        </div>
      ) : (
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredSlides.map((slide) => {
            const cardPreview = resolveSlidePreview(slide, animeList, null)
            return (
              <BannerGridCard
                key={slide.id}
                slide={slide}
                mediaSrc={cardPreview.mediaSrc}
                mediaFallbackSrc={cardPreview.mediaFallbackSrc}
                title={cardPreview.title}
                description={cardPreview.description}
                tags={cardPreview.tags}
                onClick={() => openEditor(slide)}
                selected={false}
                bulkChecked={bulk.isSelected(slide.id)}
                onBulkToggle={bulk.toggle}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
