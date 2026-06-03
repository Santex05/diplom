import express from 'express'
import cors from 'cors'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import multer from 'multer'
import { createStore } from './store.js'
import { createBannerStore, HOME_BANNER_PUBLIC_LIMIT, HomeBannerLimitError } from './bannerStore.js'
import { createAuth } from './auth.js'
import { createUserStore } from './userStore.js'
import { registerUserRoutes } from './userRoutes.js'
import { registerAdminRoutes } from './adminRoutes.js'
import { createAuthPageStore } from './authPageStore.js'
import { normalizeEpisodeSources, computeWatchStats } from './episodeSources.js'
import { isPgEnabled } from './db/pool.js'
import { finalizeEpisodeRelativePath } from './videoTranscode.js'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ANIME_DIR = path.resolve(__dirname, process.env.ANIME_DIR || '../anime')
const DATA_FILE = path.resolve(__dirname, 'data', 'library.json')
const BANNERS_FILE = path.resolve(__dirname, 'data', 'home-banners.json')
const BANNERS_DIR = path.resolve(__dirname, 'data', 'banners')
const SESSIONS_FILE = path.resolve(__dirname, 'data', 'sessions.json')
const USERS_FILE = path.resolve(__dirname, 'data', 'users.json')
const AVATARS_DIR = path.resolve(__dirname, 'data', 'avatars')
const AUTH_PAGE_FILE = path.resolve(__dirname, 'data', 'auth-page.json')
const AUTH_PAGE_MEDIA_DIR = path.resolve(__dirname, 'data', 'auth-page')
const PORT = Number(process.env.PORT) || 3001

const ADMIN_LOGIN = process.env.ADMIN_LOGIN || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '1111'

const store = createStore({ dataFile: DATA_FILE, animeDir: ANIME_DIR })
const bannerStore = createBannerStore({ dataFile: BANNERS_FILE, bannersDir: BANNERS_DIR })
const auth = createAuth({ sessionsFile: SESSIONS_FILE })
const userStore = createUserStore({ dataFile: USERS_FILE, avatarsDir: AVATARS_DIR })
const authPageStore = createAuthPageStore({
  dataFile: AUTH_PAGE_FILE,
  mediaDir: AUTH_PAGE_MEDIA_DIR,
})
const requireAdmin = auth.middleware

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

function isInsideBase(baseDir, targetPath) {
  const base = path.resolve(baseDir)
  const target = path.resolve(targetPath)
  const rel = path.relative(base, target)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

function handleMulterError(err, res, { maxMb = 100 } = {}) {
  if (!err) return false
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: `Файл слишком большой. Максимум ${maxMb} МБ.` })
      return true
    }
    res.status(400).json({ error: 'Ошибка загрузки файла' })
    return true
  }
  console.error(err)
  res.status(500).json({ error: 'Ошибка загрузки' })
  return true
}

function animeFolder(animeId) {
  return path.join(ANIME_DIR, animeId)
}

async function compressEpisodeFile(animeId, relativeFile) {
  return finalizeEpisodeRelativePath(animeFolder(animeId), relativeFile)
}

const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, _file, cb) => {
      try {
        const dir = animeFolder(req.params.id || req.params.animeId)
        await fs.mkdir(dir, { recursive: true })
        cb(null, dir)
      } catch (e) {
        cb(e)
      }
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
      cb(null, `poster${ext}`)
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
})

const episodeUpload = multer({
  storage: multer.diskStorage({
    destination: async (req, _file, cb) => {
      try {
        const dir = path.join(animeFolder(req.params.id || req.params.animeId), 'episodes')
        await fs.mkdir(dir, { recursive: true })
        cb(null, dir)
      } catch (e) {
        cb(e)
      }
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.mp4'
      const base = path
        .basename(file.originalname, ext)
        .replace(/[^\w.\-а-яА-ЯёЁ]/gi, '_')
        .slice(0, 60)
      cb(null, `${Date.now()}_${base || 'video'}${ext}`)
    },
  }),
  limits: { fileSize: 1024 * 1024 * 1024 * 4 },
})

// ——— Public API ———

app.get('/api/anime', async (_req, res) => {
  try {
    const list = await store.getAllAnime()
    res.json(await Promise.all(list.map((a) => enrichPublicAnime(a))))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Не удалось загрузить каталог' })
  }
})

app.get('/api/anime/:animeId', async (req, res) => {
  try {
    const anime = await store.getAnimeById(decodeURIComponent(req.params.animeId))
    if (!anime) return res.status(404).json({ error: 'Аниме не найдено' })
    res.json(await enrichPublicAnime(anime))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

app.get('/api/anime/:animeId/rating', (req, res) => {
  try {
    const animeId = decodeURIComponent(req.params.animeId)
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
    const userId = userStore.userIdFromToken(token)
    const stats = userStore.getAnimeRatingStats(animeId)
    res.json({
      ...stats,
      userScore: userId ? userStore.getUserRating(userId, animeId) : null,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

app.patch('/api/anime/:animeId/episodes/:episodeId/duration', async (req, res) => {
  try {
    const sec = Number(req.body?.durationSeconds)
    if (!Number.isFinite(sec) || sec <= 0) {
      return res.status(400).json({ error: 'Некорректная длительность' })
    }
    const ep = await store.setEpisodeDuration(
      decodeURIComponent(req.params.animeId),
      decodeURIComponent(req.params.episodeId),
      sec,
    )
    if (!ep) return res.status(404).json({ error: 'Серия не найдена' })
    res.json({ ok: true, durationSeconds: ep.durationSeconds })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

app.get('/api/anime/:animeId/episodes/:episodeId', async (req, res) => {
  try {
    const data = await store.getEpisode(req.params.animeId, req.params.episodeId)
    if (!data) return res.status(404).json({ error: 'Серия не найдена' })
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

app.get('/api/anime/:animeId/episodes/:episodeId/download', (_req, res) => {
  res.status(403).json({ error: 'Скачивание отключено' })
})

app.get('/api/home-banners', async (_req, res) => {
  try {
    const slides = await resolvePublicHomeBanners()
    res.setHeader('Cache-Control', 'no-store')
    res.json(slides)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Не удалось загрузить баннеры' })
  }
})

app.use('/media/avatars', async (req, res) => {
  try {
    const name = path.basename(decodeURIComponent(req.path))
    const filePath = path.join(AVATARS_DIR, name)
    if (!isInsideBase(AVATARS_DIR, filePath)) {
      return res.status(403).json({ error: 'Access denied' })
    }
    const resolved = path.resolve(filePath)
    await fs.access(resolved)
    res.sendFile(resolved)
  } catch {
    res.status(404).end()
  }
})

function sendMediaFile(res, filePath, { cacheable = false } = {}) {
  if (cacheable) {
    res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate')
  } else {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
  }
  res.sendFile(filePath, { acceptRanges: true, dotfiles: 'deny' }, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ error: 'Failed to send file' })
    }
  })
}

const BANNER_MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.mov': 'video/quicktime',
  '.m4v': 'video/mp4',
  '.mkv': 'video/x-matroska',
}

const MEDIA_MIME = {
  ...BANNER_MIME,
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
}

app.use('/media/auth-page', async (req, res) => {
  try {
    const name = path.basename(decodeURIComponent(req.path))
    const filePath = path.join(AUTH_PAGE_MEDIA_DIR, name)
    if (!isInsideBase(AUTH_PAGE_MEDIA_DIR, filePath)) {
      return res.status(403).json({ error: 'Access denied' })
    }
    const resolved = path.resolve(filePath)
    await fs.access(resolved)
    const ext = path.extname(resolved).toLowerCase()
    const mime = MEDIA_MIME[ext]
    if (mime) res.type(mime)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    sendMediaFile(res, resolved, { cacheable: false })
  } catch {
    res.status(404).json({ error: 'File not found' })
  }
})

app.use('/media/banners', async (req, res) => {
  try {
    const segments = req.path
      .split('/')
      .filter(Boolean)
      .map((s) => decodeURIComponent(s))
    if (segments.length < 2) return res.status(400).json({ error: 'Path required' })
    const filePath = path.join(BANNERS_DIR, ...segments)
    if (!isInsideBase(BANNERS_DIR, filePath)) {
      return res.status(403).json({ error: 'Access denied' })
    }
    const resolved = path.resolve(filePath)
    await fs.access(resolved)
    const ext = path.extname(resolved).toLowerCase()
    const mime = BANNER_MIME[ext]
    if (mime) res.type(mime)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    sendMediaFile(res, resolved, { cacheable: false })
  } catch {
    res.status(404).json({ error: 'File not found' })
  }
})

app.use('/media', async (req, res) => {
  try {
    const segments = req.path
      .split('/')
      .filter(Boolean)
      .map((s) => decodeURIComponent(s))

    if (!segments.length) {
      return res.status(400).json({ error: 'Path required' })
    }

    if (segments[0] === 'banners') {
      return res.status(404).json({ error: 'File not found' })
    }

    const filePath = path.join(ANIME_DIR, ...segments)
    if (!isInsideBase(ANIME_DIR, filePath)) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const resolved = path.resolve(filePath)
    await fs.access(resolved)
    const ext = path.extname(resolved).toLowerCase()
    const mime = MEDIA_MIME[ext]
    if (mime) res.type(mime)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    sendMediaFile(res, resolved, { cacheable: true })
  } catch {
    res.status(404).json({ error: 'File not found' })
  }
})

// ——— Admin auth ———

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, admin: true, name: 'anicatalog-server', apiVersion: 2 })
})

/** Всегда подставляет type/season из library.json (на случай устаревшего процесса на 3001) */
async function enrichPublicAnime(anime) {
  if (!anime?.id) return anime
  const lib = await store.loadLibrary()
  const raw = lib.anime.find((a) => a.id === anime.id)
  const type = raw?.type || anime.type || 'TV'
  const season = raw?.season ?? anime.season ?? null
  const { average: ratingAverage, count: ratingCount } = userStore.getAnimeRatingStats(anime.id)
  return {
    ...anime,
    type,
    season,
    animeType: type,
    releaseSeason: season,
    ratingAverage,
    ratingCount,
  }
}

async function resolvePublicHomeBanners() {
  const slides = (await bannerStore.getAllSlides())
    .filter((s) => s.enabled)
    .slice(0, HOME_BANNER_PUBLIC_LIMIT)
  const animeList = await store.getAllAnime()
  const animeMap = new Map(animeList.map((a) => [a.id, a]))

  return slides
    .map((slide) => {
      const image = slide.image
        ? bannerStore.mediaPath(slide.id, slide.image, slide.mediaVersion)
        : null
      const buttons = (slide.buttons || []).filter((b) => b.enabled !== false)

      if (slide.type === 'anime' && slide.animeId) {
        const anime = animeMap.get(slide.animeId)
        if (!anime) return null
        const tags = slide.tags?.length
          ? slide.tags
          : [
              ...(anime.categories?.isNew ? ['Новинка'] : []),
              ...(anime.genres?.slice(0, 2).map((g) => g) ?? []),
            ]
        return {
          id: slide.id,
          type: 'anime',
          animeId: slide.animeId,
          title: slide.title?.trim() || anime.title,
          description: slide.description?.trim() || anime.description || '',
          image: image || anime.cover,
          tags,
          buttons: buttons.length ? buttons : undefined,
          anime,
        }
      }

      if (slide.type === 'custom') {
        if (!slide.title?.trim() && !image) return null
        return {
          id: slide.id,
          type: 'custom',
          title: slide.title || '',
          description: slide.description || '',
          image,
          tags: slide.tags || [],
          buttons,
        }
      }

      return null
    })
    .filter(Boolean)
}

const BANNER_MEDIA_MAX_MB = 100

const bannerUpload = multer({
  storage: multer.diskStorage({
    destination: async (req, _file, cb) => {
      try {
        const dir = bannerStore.slideDir(decodeURIComponent(req.params.id))
        await fs.mkdir(dir, { recursive: true })
        cb(null, dir)
      } catch (e) {
        cb(e)
      }
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
      cb(null, `${Date.now()}_banner${ext}`)
    },
  }),
  limits: { fileSize: BANNER_MEDIA_MAX_MB * 1024 * 1024 },
})

app.post('/api/admin/login', (req, res) => {
  const login = String(req.body?.login ?? '').trim()
  const password = String(req.body?.password ?? '').trim()
  if (login === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
    return res.json({ token: auth.issueToken(), login: ADMIN_LOGIN })
  }
  res.status(401).json({ error: 'Неверный логин или пароль' })
})

app.get('/api/admin/session', requireAdmin, (_req, res) => {
  res.json({ ok: true, role: 'admin' })
})

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  auth.revokeToken(token)
  res.json({ ok: true })
})

// ——— Admin home banners ———

app.get('/api/admin/home-banners', requireAdmin, async (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store')
    res.json(await bannerStore.getAllSlides())
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

app.post('/api/admin/home-banners', requireAdmin, async (req, res) => {
  try {
    const slide = await bannerStore.createSlide(req.body || {})
    res.status(201).json(slide)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Не удалось создать слайд' })
  }
})

app.put('/api/admin/home-banners/reorder', requireAdmin, async (req, res) => {
  try {
    const ids = req.body?.ids
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'Нужен массив ids' })
    res.json(await bannerStore.reorderSlides(ids))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

app.put('/api/admin/home-banners/:id', requireAdmin, async (req, res) => {
  try {
    const id = decodeURIComponent(req.params.id)
    const slide = await bannerStore.updateSlide(id, req.body || {})
    if (!slide) return res.status(404).json({ error: 'Слайд не найден' })
    res.json(slide)
  } catch (err) {
    if (err instanceof HomeBannerLimitError) {
      return res.status(400).json({ error: err.message })
    }
    console.error(err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

app.delete('/api/admin/home-banners/:id', requireAdmin, async (req, res) => {
  try {
    const ok = await bannerStore.deleteSlide(decodeURIComponent(req.params.id))
    if (!ok) return res.status(404).json({ error: 'Слайд не найден' })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

app.post('/api/admin/home-banners/bulk-delete', requireAdmin, async (req, res) => {
  try {
    const ids = req.body?.ids
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Укажите массив ids' })
    }
    const deleted = []
    const failed = []
    for (const rawId of ids) {
      const id = decodeURIComponent(String(rawId))
      try {
        const ok = await bannerStore.deleteSlide(id)
        if (ok) deleted.push(id)
        else failed.push({ id, error: 'Слайд не найден' })
      } catch (err) {
        failed.push({ id, error: err.message || 'Ошибка' })
      }
    }
    res.json({ deleted, failed })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка массового удаления' })
  }
})

app.post(
  '/api/admin/home-banners/:id/image',
  requireAdmin,
  (req, res, next) => {
    bannerUpload.single('banner')(req, res, (err) => {
      if (handleMulterError(err, res, { maxMb: BANNER_MEDIA_MAX_MB })) return
      next()
    })
  },
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Файл не загружен' })
      const id = decodeURIComponent(req.params.id)
      const slide = await bannerStore.setSlideImage(id, req.file.filename)
      if (!slide) return res.status(404).json({ error: 'Слайд не найден' })
      res.json({
        ...slide,
        imageUrl: bannerStore.mediaPath(id, req.file.filename, slide.mediaVersion),
      })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Ошибка загрузки' })
    }
  },
)

// ——— Admin CRUD ———

app.get('/api/admin/anime', requireAdmin, async (_req, res) => {
  try {
    const lib = await store.loadLibrary()
    const list = lib.anime.map((a) => {
      const eps = lib.episodes
        .filter((e) => e.animeId === a.id)
        .sort((x, y) => x.number - y.number)
        .map((ep) => ({
          ...ep,
          sources: normalizeEpisodeSources(ep),
        }))
      const stats = computeWatchStats(eps)
      return {
        ...a,
        type: a.type || 'TV',
        season: a.season ?? null,
        cover: a.poster
          ? `/media/${encodeURIComponent(a.id)}/${encodeURIComponent(a.poster)}`
          : null,
        backgroundVideo: a.backgroundVideo
          ? `/media/${encodeURIComponent(a.id)}/${encodeURIComponent(a.backgroundVideo)}`
          : null,
        episodeCount: eps.length,
        episodeDurationSeconds: stats.episodeDurationSeconds,
        totalWatchSeconds: stats.totalWatchSeconds,
        episodes: eps,
      }
    })
    res.json(list.sort((a, b) => a.title.localeCompare(b.title, 'ru')))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

app.post('/api/admin/anime', requireAdmin, async (req, res) => {
  try {
    const anime = await store.createAnime(req.body || {})
    res.status(201).json(await enrichPublicAnime(anime))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Не удалось создать аниме' })
  }
})

app.put('/api/admin/anime/:id', requireAdmin, async (req, res) => {
  try {
    const animeId = decodeURIComponent(req.params.id)
    const body = req.body || {}
    const anime = await store.updateAnime(animeId, {
      ...body,
      type: body.type,
      season: body.season ?? null,
    })
    if (!anime) return res.status(404).json({ error: 'Не найдено' })
    res.json(await enrichPublicAnime(anime))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка обновления' })
  }
})

app.patch('/api/admin/anime/:id/meta', requireAdmin, async (req, res) => {
  try {
    const animeId = decodeURIComponent(req.params.id)
    const body = req.body || {}
    const anime = await store.updateAnime(animeId, {
      type: body.type,
      season: body.season ?? null,
      year: body.year,
      ageRating: body.ageRating ?? null,
      title: body.title,
      description: body.description,
      genres: body.genres,
      categories: body.categories,
    })
    if (!anime) return res.status(404).json({ error: 'Не найдено' })
    res.json(await enrichPublicAnime(anime))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка сохранения метаданных' })
  }
})

app.delete('/api/admin/anime/:id', requireAdmin, async (req, res) => {
  try {
    await store.deleteAnime(req.params.id)
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка удаления' })
  }
})

app.post('/api/admin/anime/bulk-delete', requireAdmin, async (req, res) => {
  try {
    const ids = req.body?.ids
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Укажите массив ids' })
    }
    const deleted = []
    const failed = []
    for (const rawId of ids) {
      const id = String(rawId)
      try {
        await store.deleteAnime(id)
        deleted.push(id)
      } catch (err) {
        failed.push({ id, error: err.message || 'Ошибка' })
      }
    }
    res.json({ deleted, failed })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка массового удаления' })
  }
})

app.post(
  '/api/admin/anime/:id/poster',
  requireAdmin,
  upload.single('poster'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Файл не загружен' })
      const anime = await store.setPoster(req.params.id, req.file.filename)
      if (!anime) return res.status(404).json({ error: 'Не найдено' })
      res.json(anime)
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Ошибка загрузки постера' })
    }
  },
)

app.post(
  '/api/admin/anime/:id/background',
  requireAdmin,
  upload.single('background'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Файл не загружен' })
      const anime = await store.setBackgroundVideo(req.params.id, req.file.filename)
      if (!anime) return res.status(404).json({ error: 'Не найдено' })
      res.json(anime)
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Ошибка загрузки фона' })
    }
  },
)

function parseQualitiesBody(body) {
  try {
    const raw = body?.qualities
    if (!raw) return []
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return []
  }
}

app.post(
  '/api/admin/anime/:id/episodes',
  requireAdmin,
  (req, res, next) => {
    episodeUpload.fields([
      { name: 'video', maxCount: 1 },
      { name: 'videos', maxCount: 12 },
    ])(req, res, (err) => {
      if (err) {
        console.error('Multer episode:', err)
        return res.status(400).json({
          error: err.code === 'LIMIT_FILE_SIZE' ? 'Файл слишком большой' : 'Ошибка загрузки видео',
        })
      }
      next()
    })
  },
  async (req, res) => {
    try {
      const animeId = decodeURIComponent(req.params.id)
      const multi = req.files?.videos || []
      const single = req.files?.video?.[0]
      const qualities = parseQualitiesBody(req.body)

      let sources = []
      if (multi.length) {
        sources = await Promise.all(
          multi.map(async (f, i) => ({
            quality: qualities[i] || `Качество ${i + 1}`,
            file: await compressEpisodeFile(animeId, `episodes/${f.filename}`),
          })),
        )
      } else if (single) {
        sources = [
          {
            quality: qualities[0] || 'Оригинал',
            file: await compressEpisodeFile(animeId, `episodes/${single.filename}`),
          },
        ]
      }

      if (!sources.length && !req.body?.title) {
        return res.status(400).json({ error: 'Добавьте видео или метаданные серии' })
      }

      const skipFields = ['openingStartSeconds', 'openingEndSeconds', 'endingStartSeconds', 'endingEndSeconds']
      const skipPayload = {}
      for (const key of skipFields) {
        if (req.body[key] !== undefined && req.body[key] !== '') {
          skipPayload[key] = Number(req.body[key])
        }
      }

      const ep = await store.addEpisode(animeId, {
        number: Number(req.body.number) || undefined,
        title: req.body.title,
        description: req.body.description,
        sources,
        ...skipPayload,
      })
      if (!ep) return res.status(404).json({ error: 'Аниме не найдено' })
      await store.probeEpisodeDuration(animeId, ep.id)
      const anime = await store.getAnimeById(animeId)
      const episode = anime?.episodes?.find((e) => e.id === ep.id) || ep
      res.status(201).json({ episode, anime })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Ошибка добавления серии' })
    }
  },
)

app.post(
  '/api/admin/anime/:id/sync-durations',
  requireAdmin,
  async (req, res) => {
    try {
      const animeId = decodeURIComponent(req.params.id)
      const updated = await store.syncAnimeDurations(animeId)
      const anime = await store.getAnimeById(animeId)
      res.json({ updated, anime })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Ошибка' })
    }
  },
)

app.post(
  '/api/admin/anime/:id/episodes/:episodeId/sources',
  requireAdmin,
  (req, res, next) => {
    episodeUpload.single('video')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: 'Ошибка загрузки видео' })
      }
      next()
    })
  },
  async (req, res) => {
    try {
      const animeId = decodeURIComponent(req.params.id)
      const episodeId = decodeURIComponent(req.params.episodeId)
      if (!req.file) return res.status(400).json({ error: 'Видео не загружено' })
      const quality = req.body.quality || 'Оригинал'
      const file = await compressEpisodeFile(animeId, `episodes/${req.file.filename}`)
      const ep = await store.addEpisodeSource(animeId, episodeId, quality, file)
      if (!ep) return res.status(404).json({ error: 'Серия не найдена' })
      await store.probeEpisodeDuration(animeId, episodeId)
      const anime = await store.getAnimeById(animeId)
      const episode = anime?.episodes?.find((e) => e.id === episodeId) || ep
      res.json({
        ...episode,
        sources: normalizeEpisodeSources(episode),
      })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: err.message || 'Ошибка' })
    }
  },
)

app.delete(
  '/api/admin/anime/:id/episodes/:episodeId/sources/:quality',
  requireAdmin,
  async (req, res) => {
    try {
      const animeId = decodeURIComponent(req.params.id)
      const episodeId = decodeURIComponent(req.params.episodeId)
      const quality = decodeURIComponent(req.params.quality)
      const ep = await store.removeEpisodeSource(animeId, episodeId, quality)
      if (!ep) return res.status(404).json({ error: 'Не найдено' })
      res.json(ep)
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Ошибка' })
    }
  },
)

app.put('/api/admin/anime/:id/episodes/:episodeId', requireAdmin, async (req, res) => {
  try {
    const ep = await store.updateEpisode(req.params.id, req.params.episodeId, req.body || {})
    if (!ep) return res.status(404).json({ error: 'Серия не найдена' })
    res.json(ep)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

app.post(
  '/api/admin/anime/:id/episodes/:episodeId/video',
  requireAdmin,
  episodeUpload.single('video'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Видео не загружено' })
      const animeId = decodeURIComponent(req.params.id)
      const episodeId = decodeURIComponent(req.params.episodeId)
      const quality = req.body.quality || 'Оригинал'
      const file = await compressEpisodeFile(animeId, `episodes/${req.file.filename}`)
      const ep = await store.addEpisodeSource(animeId, episodeId, quality, file)
      if (!ep) return res.status(404).json({ error: 'Серия не найдена' })
      await store.probeEpisodeDuration(animeId, episodeId)
      res.json(ep)
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Ошибка' })
    }
  },
)

app.delete('/api/admin/anime/:id/episodes/:episodeId', requireAdmin, async (req, res) => {
  try {
    await store.deleteEpisode(req.params.id, req.params.episodeId)
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка' })
  }
})

registerUserRoutes(app, {
  userStore,
  getAnimeList: () => store.getAllAnime(),
})

registerAdminRoutes(app, {
  requireAdmin,
  userStore,
  authPageStore,
  authPageMediaDir: AUTH_PAGE_MEDIA_DIR,
  avatarsDir: AVATARS_DIR,
  handleMulterError,
})

app.listen(PORT, async () => {
  await auth.loadSessions()
  await userStore.load()
  await authPageStore.ensureDirs()
  await fs.mkdir(AVATARS_DIR, { recursive: true })
  await store.ensureDirs()
  await bannerStore.ensureDirs()
  await store.importFromDiskIfEmpty()
  const list = await store.getAllAnime()
  console.log(`AniCatalog server: http://localhost:${PORT}`)
  console.log(`Storage: ${isPgEnabled() ? 'PostgreSQL' : 'JSON (dev)'}`)
  console.log(`Anime directory: ${ANIME_DIR}`)
  if (!isPgEnabled()) console.log(`Library file: ${DATA_FILE}`)
  console.log(`Titles: ${list.length}`)
})
