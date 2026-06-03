import { useCallback, useEffect, useRef, useState } from 'react'
import {
  adminFetchAuthPage,
  adminUpdateAuthPage,
  adminUploadAuthPageImage,
  mediaUrl,
} from '../../api'

const inputCls =
  'mt-1 w-full rounded-xl border border-white/10 bg-[#0b0e14] px-3 py-2.5 text-sm text-white focus:border-[#c4b5fd]/40 focus:outline-none'

export default function AdminAuthPage() {
  const fileRef = useRef(null)
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [image, setImage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    adminFetchAuthPage()
      .then((data) => {
        setTitle(data.title || '')
        setSubtitle(data.subtitle || '')
        setImage(data.image || null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const saveText = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await adminUpdateAuthPage({ title, subtitle })
      setTitle(data.title)
      setSubtitle(data.subtitle)
      setImage(data.image || image)
      setMessage('Текст сохранён')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const onImage = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const data = await adminUploadAuthPageImage(file)
      setImage(data.image)
      setMessage('Изображение загружено')
    } catch (ex) {
      setError(ex.message)
    } finally {
      setSaving(false)
      e.target.value = ''
    }
  }

  if (loading) return <p className="text-[#9ca3af]">Загрузка…</p>

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Страница входа и регистрации</h1>
        <p className="mt-2 text-sm text-[#9ca3af]">
          Левая панель на странице /auth: изображение, заголовок и описание.
        </p>
      </header>

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

      <div className="space-y-5 rounded-2xl border border-white/10 bg-[#141820]/60 p-5">
        <div>
          <label className="text-sm text-[#9ca3af]">Заголовок</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-sm text-[#9ca3af]">Описание</label>
          <textarea
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            maxLength={300}
            rows={3}
            className={inputCls}
          />
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={saveText}
          className="rounded-xl bg-[#c4b5fd] px-5 py-2.5 text-sm font-semibold text-[#1e1b4b] disabled:opacity-50"
        >
          Сохранить текст
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#141820]/60 p-5">
        <p className="text-sm font-medium text-white">Изображение баннера</p>
        <p className="mt-1 text-xs text-[#6b7280]">Рекомендуется горизонтальное фото, до 8 МБ</p>
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click()
          }}
          className="relative mt-4 aspect-[16/10] cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-white/15 bg-[#0b0e14]"
        >
          {image ? (
            <img src={mediaUrl(image)} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-sm text-[#6b7280]">
              Нажмите, чтобы загрузить
            </span>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onImage} />
      </div>
    </div>
  )
}
