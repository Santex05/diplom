import { query } from './pool.js'

export async function readLibrary() {
  const animeRes = await query('SELECT * FROM anime ORDER BY created_at')
  const epRes = await query('SELECT * FROM episodes ORDER BY anime_id, number')
  const srcRes = await query(
    'SELECT * FROM episode_sources ORDER BY episode_id, sort_order, id',
  )

  const sourcesByEp = new Map()
  for (const row of srcRes.rows) {
    const list = sourcesByEp.get(row.episode_id) || []
    list.push({ quality: row.quality, file: row.file_path })
    sourcesByEp.set(row.episode_id, list)
  }

  const episodes = epRes.rows.map((row) => ({
    id: row.id,
    animeId: row.anime_id,
    number: row.number,
    title: row.title,
    description: row.description,
    file: row.file_legacy,
    durationSeconds: row.duration_seconds,
    openingStartSeconds: row.opening_start_seconds,
    openingEndSeconds: row.opening_end_seconds,
    endingStartSeconds: row.ending_start_seconds,
    endingEndSeconds: row.ending_end_seconds,
    sources: sourcesByEp.get(row.id) || [],
  }))

  const anime = animeRes.rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    genres: row.genres || [],
    categories: row.categories || {},
    year: row.year,
    ageRating: row.age_rating,
    type: row.type,
    season: row.season,
    popularity: row.popularity,
    poster: row.poster,
    backgroundVideo: row.background_video,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
  }))

  return { anime, episodes }
}

export async function writeLibrary(lib) {
  const client = (await import('./pool.js')).getPool()
  const c = await client.connect()
  try {
    await c.query('BEGIN')
    const animeIds = new Set((lib.anime || []).map((a) => a.id))
    const episodeIds = new Set((lib.episodes || []).map((e) => e.id))

    if (animeIds.size) {
      await c.query('DELETE FROM anime WHERE id <> ALL($1::text[])', [[...animeIds]])
    } else {
      await c.query('DELETE FROM anime')
    }

    for (const a of lib.anime || []) {
      await c.query(
        `INSERT INTO anime (id, title, description, genres, categories, year, age_rating, type, season, popularity, poster, background_video, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (id) DO UPDATE SET
           title=EXCLUDED.title, description=EXCLUDED.description, genres=EXCLUDED.genres,
           categories=EXCLUDED.categories, year=EXCLUDED.year, age_rating=EXCLUDED.age_rating,
           type=EXCLUDED.type, season=EXCLUDED.season, popularity=EXCLUDED.popularity,
           poster=EXCLUDED.poster, background_video=EXCLUDED.background_video`,
        [
          a.id,
          a.title || '',
          a.description || '',
          JSON.stringify(a.genres || []),
          JSON.stringify(a.categories || {}),
          a.year ?? null,
          a.ageRating ?? null,
          a.type || 'TV',
          a.season ?? null,
          a.popularity ?? 50,
          a.poster ?? null,
          a.backgroundVideo ?? null,
          a.createdAt || new Date().toISOString(),
        ],
      )
    }

    if (episodeIds.size) {
      await c.query('DELETE FROM episodes WHERE id <> ALL($1::text[])', [[...episodeIds]])
    } else {
      await c.query('DELETE FROM episodes')
    }

    for (const ep of lib.episodes || []) {
      await c.query(
        `INSERT INTO episodes (id, anime_id, number, title, description, file_legacy, duration_seconds,
          opening_start_seconds, opening_end_seconds, ending_start_seconds, ending_end_seconds)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO UPDATE SET
           anime_id=EXCLUDED.anime_id, number=EXCLUDED.number, title=EXCLUDED.title,
           description=EXCLUDED.description, file_legacy=EXCLUDED.file_legacy,
           duration_seconds=EXCLUDED.duration_seconds,
           opening_start_seconds=EXCLUDED.opening_start_seconds,
           opening_end_seconds=EXCLUDED.opening_end_seconds,
           ending_start_seconds=EXCLUDED.ending_start_seconds,
           ending_end_seconds=EXCLUDED.ending_end_seconds`,
        [
          ep.id,
          ep.animeId,
          ep.number ?? 1,
          ep.title || '',
          ep.description || '',
          ep.file ?? null,
          ep.durationSeconds ?? null,
          ep.openingStartSeconds ?? null,
          ep.openingEndSeconds ?? null,
          ep.endingStartSeconds ?? null,
          ep.endingEndSeconds ?? null,
        ],
      )
      await c.query('DELETE FROM episode_sources WHERE episode_id = $1', [ep.id])
      const sources = ep.sources || []
      for (let i = 0; i < sources.length; i++) {
        const s = sources[i]
        await c.query(
          `INSERT INTO episode_sources (episode_id, quality, file_path, sort_order) VALUES ($1,$2,$3,$4)`,
          [ep.id, s.quality || 'Оригинал', s.file, i],
        )
      }
    }

    await c.query('COMMIT')
  } catch (err) {
    await c.query('ROLLBACK')
    throw err
  } finally {
    c.release()
  }
}
