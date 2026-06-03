import multer from 'multer'
import path from 'path'

export function registerAdminRoutes(app, {
  requireAdmin,
  userStore,
  authPageStore,
  authPageMediaDir,
  avatarsDir,
  handleMulterError,
}) {
  app.get('/api/auth-page', async (_req, res) => {
    try {
      res.json(await authPageStore.getPublic())
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Не удалось загрузить настройки' })
    }
  })

  app.get('/api/admin/auth-page', requireAdmin, async (_req, res) => {
    try {
      res.json(await authPageStore.getPublic())
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Ошибка' })
    }
  })

  app.put('/api/admin/auth-page', requireAdmin, async (req, res) => {
    try {
      res.json(await authPageStore.update(req.body || {}))
    } catch (err) {
      res.status(400).json({ error: err.message || 'Ошибка' })
    }
  })

  const authPageUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, authPageMediaDir),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
        cb(null, `auth_${Date.now()}${ext}`)
      },
    }),
    limits: { fileSize: 8 * 1024 * 1024 },
  })

  app.post(
    '/api/admin/auth-page/image',
    requireAdmin,
    authPageUpload.single('image'),
    async (req, res) => {
      try {
        if (!req.file) return res.status(400).json({ error: 'Файл не загружен' })
        res.json(await authPageStore.setImage(req.file.filename))
      } catch (err) {
        if (handleMulterError(err, res, { maxMb: 8 })) return
        res.status(400).json({ error: err.message || 'Ошибка загрузки' })
      }
    },
  )

  app.get('/api/admin/users', requireAdmin, async (_req, res) => {
    try {
      res.json({ users: userStore.listUsersForAdmin() })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Ошибка' })
    }
  })

  app.get('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
      const user = userStore.getUserById(decodeURIComponent(req.params.id))
      if (!user) return res.status(404).json({ error: 'Пользователь не найден' })
      res.json({ user: userStore.adminUserDetail(user) })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Ошибка' })
    }
  })

  app.patch('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
      const id = decodeURIComponent(req.params.id)
      const user = await userStore.adminUpdateUser(id, req.body || {})
      res.json({ user: userStore.adminUserDetail(user) })
    } catch (err) {
      res.status(400).json({ error: err.message || 'Ошибка' })
    }
  })

  app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
      const id = decodeURIComponent(req.params.id)
      await userStore.adminDeleteUser(id)
      res.json({ ok: true })
    } catch (err) {
      res.status(400).json({ error: err.message || 'Ошибка удаления' })
    }
  })

  app.post('/api/admin/users/bulk-delete', requireAdmin, async (req, res) => {
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
          await userStore.adminDeleteUser(id)
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

  const adminAvatarUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, avatarsDir),
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
        cb(null, `${decodeURIComponent(req.params.id)}${ext}`)
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
  })

  app.post(
    '/api/admin/users/:id/avatar',
    requireAdmin,
    adminAvatarUpload.single('avatar'),
    async (req, res) => {
      try {
        if (!req.file) return res.status(400).json({ error: 'Файл не загружен' })
        const id = decodeURIComponent(req.params.id)
        const avatarPath = `/media/avatars/${req.file.filename}`
        const user = await userStore.adminSetAvatar(id, avatarPath)
        res.json({ user: userStore.adminUserDetail(user) })
      } catch (err) {
        if (handleMulterError(err, res, { maxMb: 5 })) return
        res.status(400).json({ error: err.message || 'Ошибка' })
      }
    },
  )
}
