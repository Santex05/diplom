import multer from 'multer'
import path from 'path'

export function registerUserRoutes(app, { userStore, getAnimeList }) {
  function userMiddleware(req, res, next) {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
    const userId = userStore.userIdFromToken(token)
    if (!userId) return res.status(401).json({ error: 'Войдите в аккаунт' })
    req.userId = userId
    userStore.touchLastSeen(userId)
    next()
  }

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { login, nickname, email, password, passwordConfirm } = req.body || {}
      if (password !== passwordConfirm) {
        return res.status(400).json({ error: 'Пароли не совпадают' })
      }
      const user = await userStore.register({ login, nickname, email, password })
      const token = userStore.issueToken(user.id)
      res.json({ token, user: userStore.publicUser(user) })
    } catch (e) {
      res.status(400).json({ error: e.message || 'Ошибка регистрации' })
    }
  })

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { login, password } = req.body || {}
      const user = await userStore.login({ login, password })
      const token = userStore.issueToken(user.id)
      res.json({ token, user: userStore.publicUser(user) })
    } catch (e) {
      res.status(401).json({ error: e.message || 'Ошибка входа' })
    }
  })

  app.post('/api/auth/logout', (req, res) => {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
    userStore.revokeToken(token)
    res.json({ ok: true })
  })

  app.get('/api/user/settings', userMiddleware, (req, res) => {
    res.json({ settings: userStore.getSettings(req.userId) })
  })

  app.patch('/api/user/settings', userMiddleware, async (req, res) => {
    try {
      const settings = await userStore.updateSettings(req.userId, req.body || {})
      res.json({ settings })
    } catch (e) {
      res.status(400).json({ error: e.message || 'Не удалось сохранить настройки' })
    }
  })

  app.get('/api/auth/me', (req, res) => {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
    const userId = userStore.userIdFromToken(token)
    if (!userId) return res.status(401).json({ error: 'Не авторизован' })
    const user = userStore.getUserById(userId)
    if (!user) return res.status(401).json({ error: 'Не авторизован' })
    userStore.touchLastSeen(userId)
    res.json({ user: userStore.publicUser(user) })
  })

  app.get('/api/user/favorites', userMiddleware, (req, res) => {
    res.json({ ids: userStore.getFavorites(req.userId) })
  })

  app.post('/api/user/favorites/:animeId', userMiddleware, async (req, res) => {
    const active = await userStore.toggleFavorite(
      req.userId,
      decodeURIComponent(req.params.animeId),
    )
    res.json({ active, ids: userStore.getFavorites(req.userId) })
  })

  app.get('/api/user/collection', userMiddleware, async (req, res) => {
    const animeList = await getAnimeList()
    const raw = userStore.getCollection(req.userId)
    const items = raw.map((entry) => {
      const meta = animeList.find(
        (a) =>
          a.id === entry.animeId ||
          decodeURIComponent(a.id) === decodeURIComponent(entry.animeId),
      )
      return {
        ...userStore.enrichCollectionEntry(entry, meta),
        animeTitle: entry.title || meta?.title || 'Без названия',
        cover: meta?.cover || entry.cover || null,
      }
    })
    res.json({ items })
  })

  app.post('/api/user/progress', userMiddleware, async (req, res) => {
    try {
      await userStore.saveProgress(req.userId, req.body)
      res.json({ ok: true })
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  })

  app.patch('/api/user/collection/:animeId/status', userMiddleware, async (req, res) => {
    try {
      const status = req.body?.status
      const allowed = ['planned', 'watching', 'watched', 'on_hold', 'dropped']
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: 'Некорректный статус' })
      }
      await userStore.setCollectionStatus(
        req.userId,
        decodeURIComponent(req.params.animeId),
        status,
        {
          title: req.body?.animeTitle,
          cover: req.body?.cover,
        },
      )
      res.json({ ok: true })
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  })

  app.delete('/api/user/collection/:animeId', userMiddleware, async (req, res) => {
    await userStore.removeFromCollection(
      req.userId,
      decodeURIComponent(req.params.animeId),
    )
    res.json({ ok: true })
  })

  app.delete(
    '/api/user/collection/:animeId/episodes/:episodeId',
    userMiddleware,
    async (req, res) => {
      await userStore.removeCollectionEpisode(
        req.userId,
        decodeURIComponent(req.params.animeId),
        decodeURIComponent(req.params.episodeId),
      )
      res.json({ ok: true })
    },
  )

  app.delete('/api/user/collection', userMiddleware, async (req, res) => {
    await userStore.clearCollection(req.userId)
    res.json({ ok: true })
  })

  app.patch('/api/user/profile', userMiddleware, async (req, res) => {
    try {
      const user = await userStore.updateProfile(req.userId, {
        nickname: req.body?.nickname,
        login: req.body?.login,
      })
      res.json({ user: userStore.publicUser(user) })
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  })

  app.patch('/api/user/password', userMiddleware, async (req, res) => {
    try {
      await userStore.updatePassword(req.userId, {
        currentPassword: req.body?.currentPassword,
        newPassword: req.body?.newPassword,
      })
      res.json({ ok: true })
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  })

  app.delete('/api/user/account', userMiddleware, async (req, res) => {
    try {
      const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
      await userStore.deleteUser(req.userId, req.body?.password)
      userStore.revokeToken(token)
      res.json({ ok: true })
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  })

  app.post('/api/user/merge-local', userMiddleware, async (req, res) => {
    try {
      await userStore.mergeLocalData(req.userId, req.body || {})
      res.json({ ok: true })
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  })

  const avatarUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, userStore.avatarsDir),
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
        cb(null, `${req.userId}${ext}`)
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
  })

  app.post(
    '/api/user/avatar',
    userMiddleware,
    avatarUpload.single('avatar'),
    async (req, res) => {
      try {
        if (!req.file) return res.status(400).json({ error: 'Файл не загружен' })
        const avatarPath = `/media/avatars/${req.file.filename}`
        const user = await userStore.setAvatar(req.userId, avatarPath)
        res.json({ user: userStore.publicUser(user) })
      } catch (e) {
        res.status(400).json({ error: e.message })
      }
    },
  )

  app.delete('/api/user/avatar', userMiddleware, async (req, res) => {
    try {
      const user = await userStore.removeAvatar(req.userId)
      res.json({ user: userStore.publicUser(user) })
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  })

  app.get('/api/user/ratings/:animeId', userMiddleware, (req, res) => {
    const animeId = decodeURIComponent(req.params.animeId)
    const stats = userStore.getAnimeRatingStats(animeId)
    res.json({
      ...stats,
      userScore: userStore.getUserRating(req.userId, animeId),
    })
  })

  app.post('/api/user/ratings/:animeId', userMiddleware, async (req, res) => {
    try {
      const animeId = decodeURIComponent(req.params.animeId)
      const score = req.body?.score
      const result = await userStore.setRating(req.userId, animeId, score)
      res.json(result)
    } catch (e) {
      res.status(400).json({ error: e.message || 'Не удалось сохранить оценку' })
    }
  })

  return { userMiddleware }
}
