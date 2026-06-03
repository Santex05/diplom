import fs from 'fs/promises'
import path from 'path'
import { isPgEnabled } from './db/pool.js'
import * as authPagePg from './db/authPagePersistence.js'

const DEFAULTS = {
  title: 'AniHex',
  subtitle: 'Сохраняйте избранное, коллекции и прогресс просмотра в своём профиле',
  image: null,
}

export function createAuthPageStore({ dataFile, mediaDir }) {
  async function ensureDirs() {
    await fs.mkdir(mediaDir, { recursive: true })
    if (isPgEnabled()) return
    await fs.mkdir(path.dirname(dataFile), { recursive: true })
    try {
      await fs.access(dataFile)
    } catch {
      await writeData({ ...DEFAULTS })
    }
  }

  async function readData() {
    await ensureDirs()
    if (isPgEnabled()) {
      const data = await authPagePg.readAuthPage()
      return { ...DEFAULTS, ...data }
    }
    const raw = await fs.readFile(dataFile, 'utf-8')
    return { ...DEFAULTS, ...JSON.parse(raw) }
  }

  async function writeData(data) {
    if (isPgEnabled()) return authPagePg.writeAuthPage(data)
    await fs.mkdir(path.dirname(dataFile), { recursive: true })
    await fs.writeFile(dataFile, JSON.stringify(data, null, 2), 'utf-8')
  }

  function publicConfig(data) {
    return {
      title: data.title || DEFAULTS.title,
      subtitle: data.subtitle || DEFAULTS.subtitle,
      image: data.image ? `/media/auth-page/${encodeURIComponent(data.image)}` : null,
    }
  }

  return {
    ensureDirs,
    async getPublic() {
      const data = await readData()
      return publicConfig(data)
    },
    async getAdmin() {
      return readData()
    },
    async update(payload) {
      const prev = await readData()
      const next = {
        title: payload.title != null ? String(payload.title).trim() : prev.title,
        subtitle: payload.subtitle != null ? String(payload.subtitle).trim() : prev.subtitle,
        image: prev.image,
      }
      if (!next.title) next.title = DEFAULTS.title
      await writeData(next)
      return publicConfig(next)
    },
    async setImage(filename) {
      const prev = await readData()
      await writeData({ ...prev, image: filename })
      return publicConfig({ ...prev, image: filename })
    },
    mediaDir,
  }
}
