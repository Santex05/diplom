import { query } from './pool.js'

function defaultDb() {
  return { users: [], sessions: {}, favorites: {}, collection: {}, ratings: {}, settings: {} }
}

export async function loadUsersDb() {
  const db = defaultDb()

  const usersRes = await query('SELECT * FROM users ORDER BY display_id')
  db.users = usersRes.rows.map((row) => ({
    id: row.id,
    displayId: row.display_id,
    login: row.login,
    nickname: row.nickname,
    email: row.email,
    passwordHash: row.password_hash,
    avatar: row.avatar,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    lastSeenAt: row.last_seen_at?.toISOString?.() || row.last_seen_at || null,
  }))

  const sessRes = await query('SELECT token, user_id FROM user_sessions')
  for (const row of sessRes.rows) {
    db.sessions[row.token] = row.user_id
  }

  const favRes = await query('SELECT user_id, anime_id FROM favorites')
  for (const row of favRes.rows) {
    if (!db.favorites[row.user_id]) db.favorites[row.user_id] = []
    db.favorites[row.user_id].push(row.anime_id)
  }

  const collRes = await query('SELECT * FROM collection_entries ORDER BY updated_at DESC')
  for (const row of collRes.rows) {
    if (!db.collection[row.user_id]) db.collection[row.user_id] = []
    const progRes = await query(
      'SELECT * FROM collection_episode_progress WHERE collection_entry_id = $1',
      [row.id],
    )
    db.collection[row.user_id].push({
      animeId: row.anime_id,
      title: row.title,
      cover: row.cover,
      manualStatus: row.manual_status,
      updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
      episodes: progRes.rows.map((p) => ({
        episodeId: p.episode_id,
        number: p.number,
        title: p.title,
        lastPositionSeconds: p.last_position_seconds,
        durationSeconds: p.duration_seconds,
        completed: p.completed,
        lastWatchedAt: p.last_watched_at?.toISOString?.() || p.last_watched_at,
      })),
    })
  }

  const ratRes = await query('SELECT anime_id, user_id, score FROM ratings')
  for (const row of ratRes.rows) {
    if (!db.ratings[row.anime_id]) db.ratings[row.anime_id] = {}
    db.ratings[row.anime_id][row.user_id] = row.score
  }

  const setRes = await query('SELECT user_id, settings FROM user_settings')
  for (const row of setRes.rows) {
    db.settings[row.user_id] = row.settings || {}
  }

  return db
}

function collectionEntryId(userId, animeId) {
  return `${userId}_${animeId}`
}

export async function saveUsersDb(db) {
  const client = (await import('./pool.js')).getPool()
  const c = await client.connect()
  try {
    await c.query('BEGIN')

    const userIds = db.users.map((u) => u.id)
    if (userIds.length) {
      await c.query('DELETE FROM users WHERE id <> ALL($1::text[])', [userIds])
    } else {
      await c.query('DELETE FROM users')
    }

    for (const u of db.users) {
      await c.query(
        `INSERT INTO users (id, display_id, login, nickname, email, password_hash, avatar, created_at, last_seen_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE SET
           display_id=EXCLUDED.display_id, login=EXCLUDED.login, nickname=EXCLUDED.nickname,
           email=EXCLUDED.email, password_hash=EXCLUDED.password_hash, avatar=EXCLUDED.avatar,
           last_seen_at=EXCLUDED.last_seen_at`,
        [
          u.id,
          u.displayId,
          u.login,
          u.nickname,
          u.email,
          u.passwordHash,
          u.avatar ?? null,
          u.createdAt || new Date().toISOString(),
          u.lastSeenAt ?? null,
        ],
      )
    }

    await c.query('DELETE FROM user_sessions')
    for (const [token, userId] of Object.entries(db.sessions || {})) {
      await c.query('INSERT INTO user_sessions (token, user_id) VALUES ($1,$2)', [token, userId])
    }

    await c.query('DELETE FROM favorites')
    for (const [userId, list] of Object.entries(db.favorites || {})) {
      for (const animeId of list) {
        await c.query('INSERT INTO favorites (user_id, anime_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [
          userId,
          animeId,
        ])
      }
    }

    await c.query('DELETE FROM collection_entries')
    for (const [userId, entries] of Object.entries(db.collection || {})) {
      for (const entry of entries) {
        const entryId = collectionEntryId(userId, entry.animeId)
        await c.query(
          `INSERT INTO collection_entries (id, user_id, anime_id, title, cover, manual_status, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            entryId,
            userId,
            entry.animeId,
            entry.title || '',
            entry.cover ?? null,
            entry.manualStatus ?? null,
            entry.updatedAt || new Date().toISOString(),
          ],
        )
        for (const ep of entry.episodes || []) {
          await c.query(
            `INSERT INTO collection_episode_progress
             (collection_entry_id, episode_id, number, title, last_position_seconds, duration_seconds, completed, last_watched_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              entryId,
              ep.episodeId,
              ep.number ?? null,
              ep.title ?? null,
              ep.lastPositionSeconds ?? 0,
              ep.durationSeconds ?? 0,
              Boolean(ep.completed),
              ep.lastWatchedAt ?? null,
            ],
          )
        }
      }
    }

    await c.query('DELETE FROM ratings')
    for (const [animeId, byUser] of Object.entries(db.ratings || {})) {
      for (const [userId, score] of Object.entries(byUser)) {
        await c.query('INSERT INTO ratings (anime_id, user_id, score) VALUES ($1,$2,$3)', [
          animeId,
          userId,
          score,
        ])
      }
    }

    await c.query('DELETE FROM user_settings')
    for (const [userId, settings] of Object.entries(db.settings || {})) {
      await c.query(
        'INSERT INTO user_settings (user_id, settings, updated_at) VALUES ($1,$2,NOW())',
        [userId, JSON.stringify(settings)],
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
