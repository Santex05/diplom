import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const VIEWPORT_PAD = 8
const ANCHOR_GAP = 6
const MIN_MENU_HEIGHT = 120

function getHeaderBottom() {
  const header = document.querySelector('.app-header-sticky')
  if (header) return header.getBoundingClientRect().bottom
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--header-height')
  const h = parseFloat(raw)
  return Number.isFinite(h) ? h : 72
}

export default function DropdownPortal({
  anchorRef,
  open,
  children,
  align = 'left',
  className = '',
  maxHeight = 320,
}) {
  const menuRef = useRef(null)
  const [pos, setPos] = useState(null)

  useLayoutEffect(() => {
    if (!open || !anchorRef?.current) {
      setPos(null)
      return undefined
    }

    const update = () => {
      const anchor = anchorRef.current.getBoundingClientRect()
      const menuEl = menuRef.current
      const headerBottom = getHeaderBottom()
      const minTop = headerBottom + ANCHOR_GAP

      const spaceBelow = window.innerHeight - anchor.bottom - VIEWPORT_PAD - ANCHOR_GAP
      const spaceAbove = anchor.top - minTop
      const fitBelow = Math.max(0, spaceBelow)
      const fitAbove = Math.max(0, spaceAbove)

      const effectiveMaxHeight = Math.min(
        maxHeight,
        Math.max(fitBelow, fitAbove, MIN_MENU_HEIGHT),
      )

      const measuredHeight = menuEl?.offsetHeight || effectiveMaxHeight
      const menuHeight = Math.min(measuredHeight, effectiveMaxHeight)

      const openUp =
        fitBelow < menuHeight + ANCHOR_GAP && fitAbove > fitBelow

      let top = openUp ? anchor.top - menuHeight - ANCHOR_GAP : anchor.bottom + ANCHOR_GAP
      top = Math.max(
        minTop,
        Math.min(top, window.innerHeight - menuHeight - VIEWPORT_PAD),
      )

      const menuWidth = menuEl?.offsetWidth || Math.max(anchor.width, 176)
      let left = align === 'right' ? anchor.right - menuWidth : anchor.left
      left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - menuWidth - VIEWPORT_PAD))

      setPos({
        top,
        left,
        minWidth: Math.max(anchor.width, 176),
        maxHeight: effectiveMaxHeight,
        openUp,
      })
    }

    update()
    const raf = requestAnimationFrame(update)
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, anchorRef, align, maxHeight, children])

  useEffect(() => {
    const el = menuRef.current
    if (!open || !el) return undefined

    const onWheel = (e) => {
      e.stopPropagation()
      const { scrollTop, scrollHeight, clientHeight } = el
      if (scrollHeight <= clientHeight + 1) {
        e.preventDefault()
        return
      }
      const scrollingUp = e.deltaY < 0
      const scrollingDown = e.deltaY > 0
      const atTop = scrollTop <= 0
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1
      if ((scrollingUp && atTop) || (scrollingDown && atBottom)) {
        e.preventDefault()
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [open, pos])

  if (!open || !pos) return null

  return createPortal(
    <div
      ref={menuRef}
      data-dropdown-menu=""
      className={`fixed z-[150] overflow-auto overscroll-contain rounded-xl border border-white/10 bg-bg-card py-1 shadow-2xl ${className}`}
      style={{
        top: pos.top,
        left: pos.left,
        minWidth: pos.minWidth,
        maxHeight: pos.maxHeight,
      }}
      onWheel={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  )
}
