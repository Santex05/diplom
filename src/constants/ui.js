/** Единая высота и скругление кнопок действий */
export const ACTION_BTN_H = 'h-10'
export const ACTION_BTN_RADIUS = 'rounded-xl'

export const actionBtnPrimary =
  `inline-flex ${ACTION_BTN_H} items-center justify-center gap-2 ${ACTION_BTN_RADIUS} bg-accent px-5 text-sm font-semibold text-bg-dark shadow-lg shadow-accent/20 transition duration-200 ease-out hover:bg-accent-btn`

export const actionBtnSecondary =
  `inline-flex ${ACTION_BTN_H} items-center justify-center gap-2 ${ACTION_BTN_RADIUS} border border-accent/35 bg-accent/15 px-4 text-sm font-medium text-white backdrop-blur-sm transition duration-200 ease-out hover:border-accent/50 hover:bg-accent/25`

export const actionBtnIcon =
  `inline-flex ${ACTION_BTN_H} w-10 shrink-0 items-center justify-center ${ACTION_BTN_RADIUS} border border-accent/30 bg-accent/15 text-white backdrop-blur-sm transition duration-200 ease-out hover:border-accent/45 hover:bg-accent/25`

export const statusActiveStyle =
  'border-accent/25 bg-accent/10 text-white shadow-md shadow-black/20 backdrop-blur-md'

export const settingsNavActive = 'bg-accent/15 text-accent'
export const settingsNavInactive = 'text-text-muted hover:bg-white/5 hover:text-white'
