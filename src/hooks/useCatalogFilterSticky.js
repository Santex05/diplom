import { useLayoutEffect, useRef } from 'react'

const FIXED_CLASS = 'catalog-filter-sticky--fixed'
const LERP = 0.22
const SNAP_PX = 0.6

function readPxVar(name, fallback) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  if (!raw) return fallback
  const n = parseFloat(raw)
  const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize)
  if (raw.endsWith('rem')) return n * rootPx
  if (raw.endsWith('px')) return n
  return n || fallback
}

function getHeaderBottom() {
  const el = document.querySelector('.app-header-sticky')
  if (el) return el.getBoundingClientRect().bottom
  return readPxVar('--header-height', 72)
}

function clampBand(value, bottomLimit, topLimit) {
  return Math.min(topLimit, Math.max(bottomLimit, value))
}

/**
 * Вниз: следует за колонкой, низ липнет только когда верхний отступ «уехал».
 * Вверх: верх у шапки. Переходы — плавная интерполяция.
 */
export function useCatalogFilterSticky(enabled) {
  const columnRef = useRef(null)
  const panelRef = useRef(null)
  const rowRef = useRef(null)
  const anchorRowTopRef = useRef(null)
  const lastScrollYRef = useRef(0)
  const edgeRef = useRef('bottom')
  const smoothTopRef = useRef(null)
  const lastTargetRef = useRef(null)

  useLayoutEffect(() => {
    if (!enabled) return undefined

    const column = columnRef.current
    const panel = panelRef.current
    const row = rowRef.current
    if (!column || !panel || !row) return undefined

    const mq = window.matchMedia('(min-width: 1024px)')
    let tickRaf = null

    const clearStyles = () => {
      smoothTopRef.current = null
      lastTargetRef.current = null
      if (tickRaf) {
        cancelAnimationFrame(tickRaf)
        tickRaf = null
      }
      panel.classList.remove(FIXED_CLASS)
      panel.style.position = ''
      panel.style.top = ''
      panel.style.left = ''
      panel.style.width = ''
      panel.style.zIndex = ''
      column.style.minHeight = ''
    }

    const captureAnchor = () => {
      if (window.scrollY > 160) return
      const top = row.getBoundingClientRect().top
      if (top > 80) anchorRowTopRef.current = top
    }

    const computeTarget = (colRect, panelH, topLimit, bottomLimit) => {
      const columnMaxTop = colRect.bottom - panelH
      const clamped = clampBand(colRect.top, bottomLimit, topLimit)

      if (columnMaxTop <= bottomLimit) {
        return columnMaxTop
      }

      if (edgeRef.current === 'top') {
        return colRect.top > bottomLimit ? Math.max(topLimit, clamped) : topLimit
      }

      // Вниз: не тянуть к верху — едем с колонкой, низ только после нижнего порога
      if (colRect.top > bottomLimit) {
        return clamped
      }
      return bottomLimit
    }

    const applySmooth = (target, topLimit, bottomLimit, columnMaxTop) => {
      let smooth = smoothTopRef.current
      if (smooth == null) smooth = target

      const dist = Math.abs(target - smooth)
      if (dist < SNAP_PX) {
        smooth = target
      } else {
        smooth += (target - smooth) * LERP
      }

      if (columnMaxTop <= bottomLimit) {
        smooth = columnMaxTop
      } else {
        smooth = clampBand(smooth, bottomLimit, topLimit)
        if (smooth > columnMaxTop && columnMaxTop >= bottomLimit) {
          smooth = columnMaxTop
        }
      }

      smoothTopRef.current = smooth
      return smooth
    }

    const update = () => {
      if (!mq.matches) {
        clearStyles()
        return
      }

      captureAnchor()

      const colRect = column.getBoundingClientRect()
      const rowRect = row.getBoundingClientRect()
      const panelH = panel.offsetHeight
      const vh = window.innerHeight
      const inset = readPxVar('--catalog-filter-inset', 24)

      const topLimit = getHeaderBottom() + inset
      const bottomLimit = vh - inset - panelH
      const anchor = anchorRowTopRef.current ?? rowRect.top
      const columnMaxTop = colRect.bottom - panelH

      const scrollY = window.scrollY
      const scrollingUp = scrollY < lastScrollYRef.current - 0.5
      const scrollingDown = scrollY > lastScrollYRef.current + 0.5
      lastScrollYRef.current = scrollY

      const wasFixed = panel.classList.contains(FIXED_CLASS)

      if (rowRect.top >= anchor - 8 || colRect.top >= topLimit) {
        edgeRef.current = 'bottom'
        clearStyles()
        return
      }

      const prevEdge = edgeRef.current

      if (scrollingUp) {
        edgeRef.current = 'top'
      } else if (scrollingDown) {
        if (prevEdge === 'top') {
          smoothTopRef.current = clampBand(colRect.top, bottomLimit, topLimit)
        }
        edgeRef.current = 'bottom'
      }

      if (!wasFixed) {
        smoothTopRef.current = Math.min(topLimit, colRect.top)
      }

      const targetTop = computeTarget(colRect, panelH, topLimit, bottomLimit)
      lastTargetRef.current = targetTop
      const top = applySmooth(targetTop, topLimit, bottomLimit, columnMaxTop)

      column.style.minHeight = `${row.offsetHeight}px`

      panel.classList.add(FIXED_CLASS)
      panel.style.position = 'fixed'
      panel.style.top = `${top}px`
      panel.style.left = `${colRect.left}px`
      panel.style.width = `${colRect.width}px`
      panel.style.zIndex = '40'

      if (
        smoothTopRef.current != null &&
        lastTargetRef.current != null &&
        Math.abs(smoothTopRef.current - lastTargetRef.current) > SNAP_PX &&
        !tickRaf
      ) {
        tickRaf = requestAnimationFrame(() => {
          tickRaf = null
          update()
        })
      }
    }

    const onScroll = () => requestAnimationFrame(update)

    const ro = new ResizeObserver(() => {
      if (window.scrollY < 80) anchorRowTopRef.current = null
      onScroll()
    })
    ro.observe(panel)
    ro.observe(row)
    ro.observe(column)

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    mq.addEventListener('change', onScroll)
    update()

    return () => {
      clearStyles()
      anchorRowTopRef.current = null
      lastScrollYRef.current = 0
      edgeRef.current = 'bottom'
      ro.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      mq.removeEventListener('change', onScroll)
    }
  }, [enabled])

  return { columnRef, panelRef, rowRef }
}
