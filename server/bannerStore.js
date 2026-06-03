import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { isPgEnabled } from './db/pool.js'
import * as bannersPg from './db/bannersPersistence.js'

export const HOME_BANNER_PUBLIC_LIMIT = 24

export class HomeBannerLimitError extends Error {
  constructor() {
    super(`На главной можно показывать не более ${HOME_BANNER_PUBLIC_LIMIT} баннеров`)
    this.name = 'HomeBannerLimitError'
  }
}

function countEnabledSlides(slides, excludeId = null) {
  return slides.filter((s) => s.enabled !== false && s.id !== excludeId).length
}

const DEFAULT_BUTTONS = {
  anime: [
    { id: 'watch', kind: 'watch', enabled: true },
    { id: 'details', kind: 'details', enabled: true },
    { id: 'queue', kind: 'queue', enabled: true },
    { id: 'favorite', kind: 'favorite', enabled: true },
    { id: 'collection', kind: 'collection', enabled: true },
  ],
  custom: [],
}

function normalizeSlide(raw) {
  const type = raw?.type === 'custom' ? 'custom' : 'anime'
  return {
    id: raw?.id || randomUUID(),
    sortOrder: Number.isFinite(raw?.sortOrder) ? raw.sortOrder : 0,
    enabled: raw?.enabled !== false,
    type,
    animeId: type === 'anime' ? raw?.animeId || null : null,
    title: raw?.title || '',
    description: raw?.description || '',
    image: raw?.image || null,
    mediaVersion: Number(raw?.mediaVersion) || 0,
    tags: Array.isArray(raw?.tags) ? raw.tags.filter(Boolean) : [],
    buttons: Array.isArray(raw?.buttons) ? raw.buttons : DEFAULT_BUTTONS[type],
  }
}

export function createBannerStore({ dataFile, bannersDir }) {
  let writeQueue = Promise.resolve()

  function enqueueWrite(task) {
    const job = writeQueue.then(task, task)
    writeQueue = job.then(
      () => {},
      () => {},
    )
    return job
  }

  async function ensureDirs() {
    await fs.mkdir(bannersDir, { recursive: true })
    if (isPgEnabled()) return
    await fs.mkdir(path.dirname(dataFile), { recursive: true })
    try {
      await fs.access(dataFile)
    } catch {
      await writeData({ slides: [] })
    }
  }

  async function readData() {
    await ensureDirs()
    if (isPgEnabled()) {
      return { slides: await bannersPg.readBanners() }
    }
    const raw = await fs.readFile(dataFile, 'utf-8')
    const data = JSON.parse(raw)
    let migrated = false
    const slides = (data.slides || []).map((s) => {
      const slide = normalizeSlide(s)
      if (slide.image && !slide.mediaVersion) {
        slide.mediaVersion = Date.now()
        migrated = true
      }
      return slide
    })
    if (migrated) {
      await writeData({ slides })
    }
    return { slides }
  }

  async function writeData(data) {
    if (isPgEnabled()) return bannersPg.writeBanners(data.slides || [])
    await fs.mkdir(path.dirname(dataFile), { recursive: true })
    await fs.writeFile(dataFile, JSON.stringify(data, null, 2), 'utf-8')
  }

  function slideDir(slideId) {
    return path.join(bannersDir, slideId)
  }

  function mediaPath(slideId, filename, mediaVersion = 0) {
    const enc = (p) => encodeURIComponent(p)
    const base = `/media/banners/${enc(slideId)}/${enc(filename)}`
    const fromName = /^(\d{10,})_/.exec(filename || '')?.[1]
    const version = mediaVersion || fromName || filename
    return `${base}?v=${encodeURIComponent(String(version))}`
  }

  async function getAllSlides() {
    const data = await readData()
    return data.slides.sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async function getSlideById(id) {
    const slides = await getAllSlides()
    return slides.find((s) => s.id === id) || null
  }

  async function createSlide(payload) {
    return enqueueWrite(async () => {
      const data = await readData()
      const maxOrder = data.slides.reduce((m, s) => Math.max(m, s.sortOrder), -1)
      const slide = normalizeSlide({
        ...payload,
        sortOrder: maxOrder + 1,
      })
      data.slides.push(slide)
      await writeData(data)
      await fs.mkdir(slideDir(slide.id), { recursive: true })
      return slide
    })
  }

  async function updateSlide(id, payload) {
    return enqueueWrite(async () => {
      const data = await readData()
      const idx = data.slides.findIndex((s) => s.id === id)
      if (idx < 0) return null
      const prev = data.slides[idx]
      const merged = { ...prev, ...payload, id }
      if (!('image' in payload)) merged.image = prev.image
      if (!('mediaVersion' in payload)) merged.mediaVersion = prev.mediaVersion
      const willEnable = merged.enabled !== false
      if (willEnable && !prev.enabled && countEnabledSlides(data.slides, id) >= HOME_BANNER_PUBLIC_LIMIT) {
        throw new HomeBannerLimitError()
      }
      data.slides[idx] = normalizeSlide(merged)
      await writeData(data)
      return data.slides[idx]
    })
  }

  async function deleteSlide(id) {
    return enqueueWrite(async () => {
      const data = await readData()
      const before = data.slides.length
      data.slides = data.slides.filter((s) => s.id !== id)
      if (data.slides.length === before) return false
      await writeData(data)
      try {
        await fs.rm(slideDir(id), { recursive: true, force: true })
      } catch {
        /* ignore */
      }
      return true
    })
  }

  async function reorderSlides(orderedIds) {
    return enqueueWrite(async () => {
      const data = await readData()
      const map = new Map(data.slides.map((s) => [s.id, s]))
      const next = []
      orderedIds.forEach((id, i) => {
        const slide = map.get(id)
        if (slide) {
          slide.sortOrder = i
          next.push(slide)
          map.delete(id)
        }
      })
      map.forEach((slide) => next.push(slide))
      next.forEach((s, i) => {
        s.sortOrder = i
      })
      data.slides = next
      await writeData(data)
      return data.slides
    })
  }

  async function clearSlideMedia(id, keepFilename = null) {
    const dir = slideDir(id)
    try {
      const files = await fs.readdir(dir)
      await Promise.all(
        files
          .filter((name) => name !== keepFilename)
          .map((name) => fs.unlink(path.join(dir, name)).catch(() => {})),
      )
    } catch {
      /* dir may not exist */
    }
  }

  async function setSlideImage(id, filename) {
    return enqueueWrite(async () => {
      await clearSlideMedia(id, filename)
      const data = await readData()
      const idx = data.slides.findIndex((s) => s.id === id)
      if (idx < 0) return null
      const prev = data.slides[idx]
      data.slides[idx] = normalizeSlide({
        ...prev,
        id,
        image: filename,
        mediaVersion: Date.now(),
      })
      await writeData(data)
      return data.slides[idx]
    })
  }

  return {
    ensureDirs,
    bannersDir,
    mediaPath,
    slideDir,
    getAllSlides,
    getSlideById,
    createSlide,
    updateSlide,
    deleteSlide,
    reorderSlides,
    setSlideImage,
  }
}
