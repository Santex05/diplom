export default function SettingsToggle({ checked, onChange, label, hint }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] py-4 last:border-0">
      <div className="min-w-0 pr-2">
        <p className="text-sm font-semibold text-white">{label}</p>
        {hint && <p className="mt-1 text-xs leading-relaxed text-text-muted">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`prefs-switch relative h-7 w-[2.85rem] shrink-0 rounded-full transition-colors duration-300 ease-out ${
          checked ? 'bg-accent/35 shadow-[inset_0_0_12px_rgba(216,180,254,0.25)]' : 'bg-white/10'
        }`}
      >
        <span
          className={`prefs-switch-knob absolute top-0.5 left-0.5 h-6 w-6 rounded-full shadow-md transition-all duration-300 ease-out ${
            checked
              ? 'translate-x-[1.15rem] bg-accent shadow-accent/40'
              : 'translate-x-0 bg-white/70'
          }`}
        />
      </button>
    </div>
  )
}
