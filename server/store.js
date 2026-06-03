import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import {
  normalizeEpisodeSources,
  buildSourcesWithPaths,
  computeWatchStats,
} from './episodeSources.js'
import { probeVideoDuration } from './videoDuration.js'
import { isPgEnabled } from './db/pool.js'
import * as libraryPg from './db/libraryPersistence.js'

const VIDEO_EXT = new Set(['.mp4', '.mkv', '.avi', '.webm', '.m4v', '.mov'])
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])

export function createStore({ dataFile, animeDir }) {
  /** Очередь записей: без неё параллельные save затирают type/season */
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
    await fs.mkdir(animeDir, { recursive: true })
    if (isPgEnabled()) return
    await fs.mkdir(path.dirname(dataFile), { recursive: true })
    try {
      await fs.access(dataFile)
    } catch {
      await writeLibraryFile({ anime: [], episodes: [] })
    }
  }

  async function readLibraryFile() {
    await ensureDirs()
    if (isPgEnabled()) return libraryPg.readLibrary()
    const raw = await fs.readFile(dataFile, 'utf-8')
    return JSON.parse(raw)
  }

  async function writeLibraryFile(data) {
    if (isPgEnabled()) return libraryPg.writeLibrary(data)
    await fs.mkdir(path.dirname(dataFile), { recursive: true })
    await fs.writeFile(dataFile, JSON.stringify(data, null, 2), 'utf-8')
  }

  function migrateLibraryInPlace(lib) {
    let migrated = false
    for (const a of lib.anime || []) {
      if (!a.type) {
        a.type = 'TV'
        migrated = true
      }
    }
    for (const ep of lib.episodes || []) {
      const sources = normalizeEpisodeSources(ep)
      if (sources.length && (!ep.sources || !ep.sources.length)) {
        ep.sources = sources
        ep.file = ep.file || sources[0]?.file
        migrated = true
      } else if (sources.length) {
        ep.sources = sources
      }
    }
    return migrated
  }

  /** Атомарно: прочитать → изменить → записать (все записи в очереди) */
  function transactional(mutator) {
    return enqueueWrite(async () => {
      const lib = await readLibraryFile()
      migrateLibraryInPlace(lib)
      const result = await mutator(lib)
      await writeLibraryFile(lib)
      return result
    })
  }

  async function loadLibrary() {
    return enqueueWrite(async () => {
      const lib = await readLibraryFile()
      if (migrateLibraryInPlace(lib)) await writeLibraryFile(lib)
      return lib
    })
  }

  async function saveLibrary(data) {
    return enqueueWrite(async () => {
      await writeLibraryFile(data)
    })
  }

  function normalizeCategories(c) {
    if (!c || typeof c !== 'object') {
      return { isNew: false, isPopular: false, isRecommended: false }
    }
    return {
      isNew: Boolean(c.isNew),
      isPopular: Boolean(c.isPopular),
      isRecommended: Boolean(c.isRecommended),
    }
  }

  function mediaPath(folderId, ...parts) {
    return `/media/${[folderId, ...parts].map((s) => encodeURIComponent(s)).join('/')}`
  }

  function normalizeSkipMarks(payload = {}, prev = {}) {
    const num = (v) => {
      const n = Number(v)
      return Number.isFinite(n) && n >= 0 ? n : null
    }
    const openingStartSeconds = num(
      payload.openingStartSeconds ?? prev.openingStartSeconds,
    )
    let openingEndSeconds = num(payload.openingEndSeconds ?? prev.openingEndSeconds)
    const endingStartSeconds = num(payload.endingStartSeconds ?? prev.endingStartSeconds)
    let endingEndSeconds = num(payload.endingEndSeconds ?? prev.endingEndSeconds)

    if (openingStartSeconds != null && openingEndSeconds != null && openingEndSeconds <= openingStartSeconds) {
      openingEndSeconds = openingStartSeconds + 1
    }
    if (endingStartSeconds != null && endingEndSeconds != null && endingEndSeconds <= endingStartSeconds) {
      endingEndSeconds = endingStartSeconds + 1
    }

    return {
      openingStartSeconds,
      openingEndSeconds,
      endingStartSeconds,
      endingEndSeconds,
    }
  }

  function buildPublicEpisode(animeId, ep) {
    const rawSources = normalizeEpisodeSources(ep)
    const sources = buildSourcesWithPaths(animeId, rawSources, mediaPath)
    const primary = sources[0]
    const skip = normalizeSkipMarks({}, ep)
    return {
      id: ep.id,
      number: ep.number,
      title: ep.title,
      description: ep.description || '',
      file: primary?.file ?? ep.file ?? null,
      durationSeconds: ep.durationSeconds ?? null,
      path: primary?.path ?? null,
      sources,
      ...skip,
    }
  }

  function toPublicAnime(anime, episodes) {
    const eps = episodes
      .filter((e) => e.animeId === anime.id)
      .sort((a, b) => a.number - b.number)
      .map((ep) => buildPublicEpisode(anime.id, ep))

    const stats = computeWatchStats(eps)
    return {
      id: anime.id,
      title: anime.title,
      description: anime.description || '',
      genres: anime.genres || [],
      categories: normalizeCategories(anime.categories),
      type: anime.type || 'TV',
      season: anime.season || null,
      year: anime.year ?? null,
      ageRating: anime.ageRating || null,
      popularity: anime.popularity ?? 50,
      cover: anime.poster ? mediaPath(anime.id, anime.poster) : null,
      backgroundVideo: anime.backgroundVideo
        ? mediaPath(anime.id, anime.backgroundVideo)
        : null,
      episodeCount: eps.length,
      episodeDurationSeconds: stats.episodeDurationSeconds,
      totalWatchSeconds: stats.totalWatchSeconds,
      episodes: eps,
    }
  }

  async function getAllAnime() {
    const lib = await loadLibrary()
    return lib.anime
      .map((a) => toPublicAnime(a, lib.episodes))
      .sort((a, b) => a.title.localeCompare(b.title, 'ru'))
  }

  async function getAnimeById(id) {
    const lib = await loadLibrary()
    const anime = lib.anime.find((a) => a.id === id)
    if (!anime) return null
    return toPublicAnime(anime, lib.episodes)
  }

  async function getEpisode(animeId, episodeId) {
    const anime = await getAnimeById(animeId)
    if (!anime) return null
    const ep = anime.episodes.find((e) => e.id === episodeId)
    if (!ep) return null
    return { anime, episode: ep }
  }

  async function createAnime(payload) {
    return transactional((lib) => {
      const id = payload.id || randomUUID()
      const folder = path.join(animeDir, id)
      fs.mkdir(folder, { recursive: true }).catch(() => {})

      const record = {
        id,
        title: payload.title || 'Без названия',
        description: payload.description || '',
        genres: payload.genres || [],
        categories: normalizeCategories(payload.categories),
        year: payload.year ?? null,
        ageRating: payload.ageRating || null,
        type: payload.type || 'TV',
        season: payload.season || null,
        popularity: payload.popularity ?? 50,
        poster: payload.poster || null,
        backgroundVideo: payload.backgroundVideo || null,
        createdAt: new Date().toISOString(),
      }

      lib.anime.push(record)
      return toPublicAnime(record, lib.episodes)
    })
  }

  async function updateAnime(id, payload) {
    return transactional((lib) => {
      const idx = lib.anime.findIndex((a) => a.id === id)
      if (idx < 0) return null

      const prev = lib.anime[idx]
      lib.anime[idx] = {
        ...prev,
        title: payload.title ?? prev.title,
        description: payload.description ?? prev.description,
        genres: payload.genres ?? prev.genres,
        categories: normalizeCategories(payload.categories ?? prev.categories),
        year: payload.year ?? prev.year,
        ageRating: 'ageRating' in payload ? payload.ageRating || null : prev.ageRating ?? null,
        type: 'type' in payload ? payload.type || 'TV' : prev.type || 'TV',
        season: 'season' in payload ? payload.season || null : prev.season ?? null,
        popularity: payload.popularity ?? prev.popularity,
        poster: payload.poster ?? prev.poster,
        backgroundVideo:
          'backgroundVideo' in payload ? payload.backgroundVideo || null : prev.backgroundVideo ?? null,
      }
      return toPublicAnime(lib.anime[idx], lib.episodes)
    })
  }

  async function deleteAnime(id) {
    return transactional(async (lib) => {
    lib.anime = lib.anime.filter((a) => a.id !== id)
    lib.episodes = lib.episodes.filter((e) => e.animeId !== id)
    try {
      await fs.rm(path.join(animeDir, id), { recursive: true, force: true })
    } catch {
      /* ignore */
    }
    })
  }

  async function addEpisode(animeId, payload) {
    return transactional((lib) => {
    if (!lib.anime.find((a) => a.id === animeId)) return null

    const sources = payload.sources?.length
      ? payload.sources.map((s) => ({
          quality: s.quality || 'Оригинал',
          file: s.file,
        }))
      : payload.file
        ? [{ quality: payload.quality || 'Оригинал', file: payload.file }]
        : []

    const skip = normalizeSkipMarks(payload)
    const ep = {
      id: payload.id || randomUUID(),
      animeId,
      number:
        Number(payload.number) ||
        lib.episodes.filter((e) => e.animeId === animeId).length + 1,
      title: payload.title || `Серия ${payload.number || ''}`,
      description: payload.description || '',
      sources,
      file: sources[0]?.file ?? null,
      durationSeconds: payload.durationSeconds ?? null,
      ...skip,
    }

    lib.episodes.push(ep)
    return ep
    })
  }

  async function addEpisodeSource(animeId, episodeId, quality, file) {
    return transactional((lib) => {
    const idx = lib.episodes.findIndex(
      (e) => e.animeId === animeId && e.id === episodeId,
    )
    if (idx < 0) return null

    const ep = lib.episodes[idx]
    const sources = normalizeEpisodeSources(ep)
    const q = quality || 'Оригинал'
    const next = sources.filter((s) => s.quality !== q)
    next.push({ quality: q, file })
    ep.sources = next
    ep.file = next[0]?.file ?? ep.file
    return ep
    })
  }

  async function removeEpisodeSource(animeId, episodeId, quality) {
    return transactional((lib) => {
    const idx = lib.episodes.findIndex(
      (e) => e.animeId === animeId && e.id === episodeId,
    )
    if (idx < 0) return null
    const ep = lib.episodes[idx]
    ep.sources = normalizeEpisodeSources(ep).filter((s) => s.quality !== quality)
    ep.file = ep.sources[0]?.file ?? null
    return ep
    })
  }

  async function updateEpisode(animeId, episodeId, payload) {
    return transactional((lib) => {
    const idx = lib.episodes.findIndex(
      (e) => e.animeId === animeId && e.id === episodeId,
    )
    if (idx < 0) return null
    const prev = lib.episodes[idx]
    const skip = normalizeSkipMarks(payload, prev)
    const next = {
      ...prev,
      ...payload,
      ...skip,
    }
    if (payload.sources) {
      next.sources = payload.sources
      next.file = payload.sources[0]?.file ?? null
    } else if (payload.file) {
      next.sources = [{ quality: payload.quality || 'Оригинал', file: payload.file }]
      next.file = payload.file
    }
    lib.episodes[idx] = next
    return lib.episodes[idx]
    })
  }

  async function setEpisodeDuration(animeId, episodeId, durationSeconds) {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return null
    const sec = Math.round(durationSeconds)
    const lib = await loadLibrary()
    const ep = lib.episodes.find((e) => e.animeId === animeId && e.id === episodeId)
    if (ep?.durationSeconds === sec) return ep
    return updateEpisode(animeId, episodeId, { durationSeconds: sec })
  }

  async function probeEpisodeDuration(animeId, episodeId) {
    const lib = await loadLibrary()
    const ep = lib.episodes.find((e) => e.animeId === animeId && e.id === episodeId)
    if (!ep) return null
    const sources = normalizeEpisodeSources(ep)
    for (const src of sources) {
      if (!src?.file) continue
      const filePath = path.join(animeDir, animeId, ...src.file.split('/').filter(Boolean))
      try {
        await fs.access(filePath)
      } catch {
        continue
      }
      const sec = await probeVideoDuration(filePath)
      if (sec) return setEpisodeDuration(animeId, episodeId, sec)
    }
    return null
  }

  async function syncAnimeDurations(animeId) {
    const lib = await loadLibrary()
    const eps = lib.episodes.filter((e) => e.animeId === animeId)
    let updated = 0
    for (const ep of eps) {
      if (ep.durationSeconds > 0) continue
      const result = await probeEpisodeDuration(animeId, ep.id)
      if (result) updated += 1
    }
    return updated
  }

  async function getEpisodeSourceFile(animeId, episodeId, quality) {
    const lib = await loadLibrary()
    const ep = lib.episodes.find((e) => e.animeId === animeId && e.id === episodeId)
    if (!ep) return null
    const sources = normalizeEpisodeSources(ep)
    const sorted = buildSourcesWithPaths(animeId, sources, mediaPath)
    if (quality) {
      const match = sorted.find((s) => s.quality === quality)
      if (match) return match
    }
    return sorted[0] || null
  }

  async function deleteEpisode(animeId, episodeId) {
    return transactional((lib) => {
      lib.episodes = lib.episodes.filter(
        (e) => !(e.animeId === animeId && e.id === episodeId),
      )
    })
  }

  async function setPoster(animeId, filename) {
    return updateAnime(animeId, { poster: filename })
  }

  async function setBackgroundVideo(animeId, filename) {
    return updateAnime(animeId, { backgroundVideo: filename })
  }

  /** Импорт папок с диска, если библиотека пуста */
  async function importFromDiskIfEmpty() {
    return transactional(async (lib) => {
    if (lib.anime.length > 0) return

    let entries = []
    try {
      entries = await fs.readdir(animeDir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries.filter((e) => e.isDirectory())) {
      const folderPath = path.join(animeDir, entry.name)
      const id = entry.name
      const videos = await scanVideos(folderPath)
      const poster = await findPoster(folderPath)
      if (!videos.length && !poster) continue

      lib.anime.push({
        id,
        title: entry.name,
        description: '',
        genres: [],
        categories: { isNew: true, isPopular: false, isRecommended: false },
        year: null,
        popularity: 50,
        poster,
        createdAt: new Date().toISOString(),
      })

      videos.forEach((v, i) => {
        lib.episodes.push({
          id: `${id}_ep_${i + 1}`,
          animeId: id,
          number: i + 1,
          title: v.title,
          description: '',
          sources: [{ quality: 'Оригинал', file: v.file }],
          file: v.file,
          durationSeconds: null,
        })
      })
    }

    if (lib.anime.length) {
      console.log(`Imported ${lib.anime.length} anime from disk`)
    }
    })
  }

  return {
    animeDir,
    ensureDirs,
    importFromDiskIfEmpty,
    getAllAnime,
    getAnimeById,
    getEpisode,
    createAnime,
    updateAnime,
    deleteAnime,
    addEpisode,
    addEpisodeSource,
    removeEpisodeSource,
    getEpisodeSourceFile,
    updateEpisode,
    deleteEpisode,
    setPoster,
    setBackgroundVideo,
    loadLibrary,
    probeEpisodeDuration,
    syncAnimeDurations,
    setEpisodeDuration,
  }
}

async function scanVideos(dir, base = '') {
  const out = []
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...(await scanVideos(full, rel.replace(/\\/g, '/'))))
    } else if (entry.isFile() && VIDEO_EXT.has(path.extname(entry.name).toLowerCase())) {
      out.push({
        title: path.basename(entry.name, path.extname(entry.name)),
        file: rel.replace(/\\/g, '/'),
      })
    }
  }
  return out.sort((a, b) => a.title.localeCompare(b.title, 'ru'))
}

async function findPoster(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const images = entries.filter((e) => e.isFile() && IMAGE_EXT.has(path.extname(e.name).toLowerCase()))
  const pref = ['cover', 'poster', 'folder']
  for (const p of pref) {
    const m = images.find((e) => e.name.toLowerCase().startsWith(p))
    if (m) return m.name
  }
  return images[0]?.name || null
}
