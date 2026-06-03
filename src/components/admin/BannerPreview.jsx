import { Link } from 'react-router-dom'
import BannerMedia from '../BannerMedia'
import { genreLabel } from '../../constants/genres'
import { actionBtnSecondary } from '../../constants/ui'

function PreviewTags({ tags }) {
  if (!tags?.length) return null
  return (
    <div className="flex flex-wrap gap-1">
      {tags.slice(0, 4).map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className="rounded-full border border-white/15 bg-black/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/80"
        >
          {genreLabel(tag) || tag}
        </span>
      ))}
    </div>
  )
}

function PreviewButtons({ buttons, compact }) {
  const visible = (buttons || []).filter((b) => b.enabled !== false)
  if (!visible.length) return null
  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? '' : 'mt-2'}`}>
      {visible.map((btn) => {
        const label = btn.label || btn.kind
        const cls =
          'rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1 text-[10px] font-medium text-white/90'
        if (btn.kind === 'route' && btn.url) {
          return (
            <Link key={btn.id} to={btn.url} className={cls}>
              {label}
            </Link>
          )
        }
        if (btn.kind === 'link' && btn.url) {
          return (
            <span key={btn.id} className={cls}>
              {label}
            </span>
          )
        }
        return (
          <span key={btn.id || btn.kind} className={cls}>
            {label}
          </span>
        )
      })}
    </div>
  )
}

/** Мини-превью для редактора */
export function BannerEditorPreview({ mediaSrc, mediaFallbackSrc, title, description, tags, buttons, type }) {
  const displayTitle = title?.trim()
  const displayDescription = description?.trim()

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0e14]">
      <div className="relative aspect-[21/9] w-full overflow-hidden bg-[#0b0e14]">
        <BannerMedia src={mediaSrc} fallbackSrc={mediaFallbackSrc} alt={displayTitle} />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#0b0e14] via-[#0b0e14]/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 z-[2] p-3">
          <PreviewTags tags={tags} />
          {displayTitle && (
            <p className="mt-2 line-clamp-1 text-sm font-bold text-white">{displayTitle}</p>
          )}
          {displayDescription && (
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/65">
              {displayDescription}
            </p>
          )}
          <PreviewButtons buttons={buttons} />
        </div>
      </div>
      <p className="border-t border-white/10 px-3 py-2 text-[10px] text-[#6b7280]">
        {type === 'anime' ? 'Баннер аниме' : 'Кастомный баннер'}
      </p>
    </div>
  )
}

/** Карточка в сетке списка баннеров */
export function BannerGridCard({
  slide,
  mediaSrc,
  mediaFallbackSrc,
  title,
  description,
  tags,
  onClick,
  selected,
  bulkChecked,
  onBulkToggle,
}) {
  const displayTitle = title?.trim()
  const displayDescription = description?.trim()
  const hasTags = tags?.length > 0
  const hasText = Boolean(displayTitle || displayDescription || hasTags)

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border text-left transition ${
        bulkChecked
          ? 'border-[#c4b5fd]/60 ring-2 ring-[#c4b5fd]/40'
          : selected
            ? 'border-[#c4b5fd]/50 ring-1 ring-[#c4b5fd]/30'
            : 'border-white/10 hover:border-white/20'
      }`}
    >
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-[#0b0e14]">
        {onBulkToggle && (
          <label
            className="absolute left-2 top-2 z-[3] flex cursor-pointer items-center gap-1 rounded-md bg-black/75 px-2 py-1"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={Boolean(bulkChecked)}
              onChange={() => onBulkToggle(slide.id)}
              className="h-4 w-4 rounded"
            />
          </label>
        )}
        <BannerMedia
          src={mediaSrc}
          fallbackSrc={mediaFallbackSrc}
          alt={displayTitle}
        />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        {!slide.enabled && (
          <span className="absolute left-2 top-2 z-[2] rounded-md bg-black/70 px-2 py-0.5 text-[10px] text-amber-200">
            Черновик
          </span>
        )}
        <span className="absolute right-2 top-2 z-[2] rounded-md bg-black/70 px-2 py-0.5 text-[10px] text-white/80">
          {slide.type === 'anime' ? 'Аниме' : 'Кастом'}
        </span>
      </div>
      {hasText && (
        <div className="flex flex-1 flex-col gap-2 bg-[#141820] p-3">
          {hasTags && <PreviewTags tags={tags} />}
          {displayTitle && (
            <p className="line-clamp-2 text-sm font-bold leading-snug text-white">{displayTitle}</p>
          )}
          {displayDescription && (
            <p className="line-clamp-2 text-xs leading-relaxed text-[#9ca3af]">{displayDescription}</p>
          )}
        </div>
      )}
    </div>
  )
}

/** Список для изменения порядка баннеров */
export function BannerOrderList({
  slides,
  getPreview,
  onMove,
  onEdit,
  saving,
  isBulkSelected,
  onBulkToggle,
}) {
  if (!slides.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 py-16 text-center text-[#9ca3af]">
        Баннеров пока нет
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-[#9ca3af]">
        Баннеры на главной показываются сверху вниз. Используйте стрелки для смены порядка.
      </p>
      {slides.map((slide, index) => {
        const preview = getPreview(slide)
        const title = preview.title?.trim()

        return (
          <div
            key={slide.id}
            className={`flex items-center gap-3 rounded-2xl border bg-[#141820] p-3 ${
              isBulkSelected?.(slide.id)
                ? 'border-[#c4b5fd]/50 ring-1 ring-[#c4b5fd]/30'
                : 'border-white/10'
            }`}
          >
            {onBulkToggle && (
              <input
                type="checkbox"
                checked={Boolean(isBulkSelected?.(slide.id))}
                onChange={() => onBulkToggle(slide.id)}
                className="h-4 w-4 shrink-0 rounded"
                aria-label="Выбрать баннер"
              />
            )}
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0b0e14] text-sm font-bold text-[#c4b5fd]">
              {index + 1}
            </span>
            <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#0b0e14]">
              <BannerMedia
                src={preview.mediaSrc}
                fallbackSrc={preview.mediaFallbackSrc}
                alt={title}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {title || (slide.type === 'anime' ? 'Баннер аниме' : 'Кастомный баннер')}
              </p>
              <p className="text-xs text-[#6b7280]">
                {slide.type === 'anime' ? 'Аниме' : 'Кастом'}
                {!slide.enabled ? ' · черновик' : ' · на главной'}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                disabled={saving || index === 0}
                onClick={() => onMove(slide.id, -1)}
                className="rounded-lg border border-white/10 px-2.5 py-2 text-sm text-white/80 hover:border-white/25 disabled:opacity-30"
                aria-label="Выше"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={saving || index === slides.length - 1}
                onClick={() => onMove(slide.id, 1)}
                className="rounded-lg border border-white/10 px-2.5 py-2 text-sm text-white/80 hover:border-white/25 disabled:opacity-30"
                aria-label="Ниже"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => onEdit(slide)}
                className="rounded-lg border border-[#c4b5fd]/30 px-3 py-2 text-sm text-[#ddd6fe] hover:bg-[#c4b5fd]/10"
              >
                Изменить
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export { actionBtnSecondary }
