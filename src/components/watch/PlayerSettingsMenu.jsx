import { useEffect, useState } from 'react'
import SettingsStorageBadge from '../settings/SettingsStorageBadge'
import { loadSitePrefs, saveSitePrefs } from '../../utils/sitePrefs'

function MenuRow({ label, value, onClick, showDot }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.06]"
    >
      <span className="text-sm font-medium text-white">{label}</span>
      <span className="flex shrink-0 items-center gap-2 text-sm text-white/55">
        {showDot && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
        <span className="tabular-nums">{value}</span>
        <svg className="h-4 w-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </span>
    </button>
  )
}

function MenuToggle({ label, hint, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        {hint && <p className="mt-0.5 text-xs leading-relaxed text-white/45">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? 'bg-accent/40' : 'bg-white/15'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-5 bg-accent-btn' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

function OptionList({ options, active, onSelect, format = (v) => v }) {
  return (
    <ul className="py-1">
      {options.map((opt) => {
        const activeOpt = opt === active
        return (
          <li key={String(opt)}>
            <button
              type="button"
              onClick={() => onSelect(opt)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition ${
                activeOpt ? 'bg-accent/15 text-accent' : 'text-white/80 hover:bg-white/[0.06]'
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  activeOpt ? 'border-accent bg-accent' : 'border-white/25'
                }`}
              >
                {activeOpt && (
                  <span className="h-1.5 w-1.5 rounded-full bg-bg-dark" />
                )}
              </span>
              {format(opt)}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export default function PlayerSettingsMenu({
  open,
  onClose,
  view,
  onViewChange,
  playbackRate,
  onSpeed,
  speedOptions,
  multiQuality,
  sourceList,
  activeQuality,
  onQuality,
  qualityLabel,
  onPrefsChange,
}) {
  const [prefs, setPrefs] = useState(() => loadSitePrefs())

  useEffect(() => {
    const sync = () => setPrefs(loadSitePrefs())
    window.addEventListener('anicatalog-prefs', sync)
    return () => window.removeEventListener('anicatalog-prefs', sync)
  }, [])

  const patch = (key, val) => {
    const next = saveSitePrefs({ [key]: val })
    setPrefs(next)
    onPrefsChange?.(next)
  }

  if (!open) return null

  const panelClass =
    'w-[min(100%,17.5rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#12121a]/98 shadow-2xl backdrop-blur-xl'

  const headerBtn =
    'flex w-full items-center gap-2 border-b border-white/[0.08] px-4 py-3 text-sm font-medium text-white/90 transition hover:bg-white/[0.05]'

  if (view === 'speed') {
    return (
      <div className={panelClass}>
        <button type="button" onClick={() => onViewChange('main')} className={headerBtn}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Назад
        </button>
        <OptionList
          options={speedOptions}
          active={playbackRate}
          onSelect={(rate) => {
            onSpeed(rate)
            onClose()
          }}
          format={(r) => `${r}x`}
        />
      </div>
    )
  }

  if (view === 'quality' && multiQuality) {
    const qualities = sourceList.map((s) => s.quality)
    return (
      <div className={panelClass}>
        <button type="button" onClick={() => onViewChange('main')} className={headerBtn}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Назад
        </button>
        <OptionList
          options={qualities}
          active={activeQuality}
          onSelect={(q) => {
            onQuality(q)
            onClose()
          }}
        />
      </div>
    )
  }

  return (
    <div className={panelClass}>
      <button type="button" onClick={onClose} className={headerBtn}>
        <span className="text-lg leading-none text-white/70">×</span>
        Закрыть
      </button>

      <div className="divide-y divide-white/[0.06]">
        <MenuRow
          label="Скорость"
          value={`${playbackRate}x`}
          onClick={() => onViewChange('speed')}
          showDot={playbackRate !== 1}
        />
        {multiQuality && (
          <MenuRow
            label="Качество"
            value={qualityLabel}
            onClick={() => onViewChange('quality')}
            showDot={false}
          />
        )}
      </div>

      <div className="border-t border-white/[0.08]">
        <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
          Управление опенингом / эндингом
        </p>
        <div className="divide-y divide-white/[0.06]">
          <MenuToggle
            label="Пропускать опенинг"
            checked={prefs.skipOpening}
            onChange={(v) => patch('skipOpening', v)}
          />
          <MenuToggle
            label="Пропускать эндинг"
            checked={prefs.skipEnding}
            onChange={(v) => patch('skipEnding', v)}
          />
        </div>
      </div>

      <div className="border-t border-white/[0.08]">
        <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
          Управление воспроизведением
        </p>
        <div className="divide-y divide-white/[0.06] pb-1">
          <MenuToggle
            label="Авто-воспроизведение"
            hint="Следующая серия через 5 сек"
            checked={prefs.autoPlayNext}
            onChange={(v) => patch('autoPlayNext', v)}
          />
          <MenuToggle
            label="Авто-полноэкранный режим"
            hint="При запуске серии"
            checked={prefs.autoFullscreen}
            onChange={(v) => patch('autoFullscreen', v)}
          />
        </div>
      </div>

      <div className="border-t border-white/[0.08] px-4 py-3">
        <SettingsStorageBadge />
      </div>
    </div>
  )
}
