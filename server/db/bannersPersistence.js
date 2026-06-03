import { query } from './pool.js'

export async function readBanners() {
  const res = await query('SELECT * FROM home_banner_slides ORDER BY sort_order')
  return res.rows.map((row) => ({
    id: row.id,
    sortOrder: row.sort_order,
    enabled: row.enabled,
    type: row.type === 'custom' ? 'custom' : 'anime',
    animeId: row.anime_id,
    title: row.title || '',
    description: row.description || '',
    image: row.image,
    mediaVersion: Number(row.media_version) || 0,
    tags: row.tags || [],
    buttons: row.buttons || [],
  }))
}

export async function writeBanners(slides) {
  const client = (await import('./pool.js')).getPool()
  const c = await client.connect()
  try {
    await c.query('BEGIN')
    const ids = slides.map((s) => s.id)
    if (ids.length) {
      await c.query('DELETE FROM home_banner_slides WHERE id <> ALL($1::text[])', [ids])
    } else {
      await c.query('DELETE FROM home_banner_slides')
    }
    for (const s of slides) {
      await c.query(
        `INSERT INTO home_banner_slides (id, sort_order, enabled, type, anime_id, title, description, image, media_version, tags, buttons)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO UPDATE SET
           sort_order=EXCLUDED.sort_order, enabled=EXCLUDED.enabled, type=EXCLUDED.type,
           anime_id=EXCLUDED.anime_id, title=EXCLUDED.title, description=EXCLUDED.description,
           image=EXCLUDED.image, media_version=EXCLUDED.media_version, tags=EXCLUDED.tags, buttons=EXCLUDED.buttons`,
        [
          s.id,
          s.sortOrder ?? 0,
          s.enabled !== false,
          s.type || 'anime',
          s.animeId ?? null,
          s.title || '',
          s.description || '',
          s.image ?? null,
          Number(s.mediaVersion) || 0,
          JSON.stringify(s.tags || []),
          JSON.stringify(s.buttons || []),
        ],
      )
    }
    await c.query('COMMIT')
  } catch (err) {
    await c.query('ROLLBACK')
    throw err
  } finally {
    c.release()
  }
}
