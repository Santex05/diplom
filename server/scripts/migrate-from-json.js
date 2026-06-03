/**
 * Однократный импорт данных из server/data/*.json в PostgreSQL.
 * Запуск: cd server && node scripts/migrate-from-json.js
 * Требует DATABASE_URL в .env
 */
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { isPgEnabled, closePool } from '../db/pool.js'
import * as libraryPg from '../db/libraryPersistence.js'
import * as usersPg from '../db/usersPersistence.js'
import * as bannersPg from '../db/bannersPersistence.js'
import * as authPagePg from '../db/authPagePersistence.js'
import { query } from '../db/pool.js'

dotenv.config({ path: path.resolve(fileURLToPath(import.meta.url), '../../.env') })

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.resolve(__dirname, '../data')

async function readJson(name, fallback) {
  try {
    const raw = await fs.readFile(path.join(dataDir, name), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

async function main() {
  if (!isPgEnabled()) {
    console.error('Задайте DATABASE_URL в server/.env')
    process.exit(1)
  }

  console.log('Импорт library.json → PostgreSQL…')
  const library = await readJson('library.json', { anime: [], episodes: [] })
  await libraryPg.writeLibrary(library)
  console.log(`  anime: ${library.anime?.length ?? 0}, episodes: ${library.episodes?.length ?? 0}`)

  console.log('Импорт users.json…')
  const users = await readJson('users.json', {
    users: [],
    sessions: {},
    favorites: {},
    collection: {},
    ratings: {},
    settings: {},
  })
  await usersPg.saveUsersDb(users)
  console.log(`  users: ${users.users?.length ?? 0}`)

  console.log('Импорт home-banners.json…')
  const banners = await readJson('home-banners.json', { slides: [] })
  await bannersPg.writeBanners(banners.slides || [])
  console.log(`  slides: ${banners.slides?.length ?? 0}`)

  console.log('Импорт auth-page.json…')
  const authPage = await readJson('auth-page.json', { title: 'AniHex', subtitle: '', image: null })
  await authPagePg.writeAuthPage(authPage)

  console.log('Импорт sessions.json (админ)…')
  const adminSessions = await readJson('sessions.json', [])
  if (Array.isArray(adminSessions)) {
    for (const token of adminSessions) {
      await query('INSERT INTO admin_sessions (token) VALUES ($1) ON CONFLICT DO NOTHING', [token])
    }
    console.log(`  admin tokens: ${adminSessions.length}`)
  }

  console.log('Готово.')
  await closePool()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
