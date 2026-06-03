import { query } from './pool.js'

const DEFAULT = { title: 'AniHex', subtitle: '', image: null }

export async function readAuthPage() {
  const res = await query('SELECT title, subtitle, image FROM auth_page_config WHERE id = 1')
  if (!res.rows[0]) return { ...DEFAULT }
  const row = res.rows[0]
  return { title: row.title || DEFAULT.title, subtitle: row.subtitle || '', image: row.image }
}

export async function writeAuthPage(data) {
  await query(
    `INSERT INTO auth_page_config (id, title, subtitle, image) VALUES (1,$1,$2,$3)
     ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, image=EXCLUDED.image`,
    [data.title || 'AniHex', data.subtitle || '', data.image ?? null],
  )
}
