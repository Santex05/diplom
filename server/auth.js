import fs from 'fs/promises'
import path from 'path'
import { isPgEnabled } from './db/pool.js'
import {
  deleteAdminToken,
  insertAdminToken,
  loadAdminTokens,
} from './db/adminSessionsPersistence.js'

export function createAuth({ sessionsFile }) {
  const tokens = new Set()

  async function loadSessions() {
    if (isPgEnabled()) {
      tokens.clear()
      const fromDb = await loadAdminTokens()
      fromDb.forEach((t) => tokens.add(t))
      return
    }
    try {
      const raw = await fs.readFile(sessionsFile, 'utf-8')
      const list = JSON.parse(raw)
      if (Array.isArray(list)) list.forEach((t) => tokens.add(t))
    } catch {
      /* первый запуск */
    }
  }

  async function persistSessions() {
    if (isPgEnabled()) return
    await fs.mkdir(path.dirname(sessionsFile), { recursive: true })
    await fs.writeFile(sessionsFile, JSON.stringify([...tokens], null, 2), 'utf-8')
  }

  function issueToken() {
    const token = `adm_${Date.now()}_${Math.random().toString(36).slice(2)}`
    tokens.add(token)
    if (isPgEnabled()) {
      insertAdminToken(token).catch(console.error)
    } else {
      persistSessions().catch(console.error)
    }
    return token
  }

  function revokeToken(token) {
    if (!token) return
    tokens.delete(token)
    if (isPgEnabled()) {
      deleteAdminToken(token).catch(console.error)
    } else {
      persistSessions().catch(console.error)
    }
  }

  function isValid(token) {
    return Boolean(token && tokens.has(token))
  }

  function middleware(req, res, next) {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
    if (!isValid(token)) {
      return res.status(401).json({ error: 'Сессия истекла. Войдите снова.' })
    }
    next()
  }

  return { loadSessions, issueToken, revokeToken, middleware }
}
