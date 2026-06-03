import { query } from './pool.js'

export async function loadAdminTokens() {
  const res = await query('SELECT token FROM admin_sessions')
  return new Set(res.rows.map((r) => r.token))
}

export async function saveAdminTokens(tokens) {
  const client = (await import('./pool.js')).getPool()
  const c = await client.connect()
  try {
    await c.query('BEGIN')
    await c.query('DELETE FROM admin_sessions')
    for (const token of tokens) {
      await c.query('INSERT INTO admin_sessions (token) VALUES ($1) ON CONFLICT DO NOTHING', [
        token,
      ])
    }
    await c.query('COMMIT')
  } catch (err) {
    await c.query('ROLLBACK')
    throw err
  } finally {
    c.release()
  }
}

export async function insertAdminToken(token) {
  await query('INSERT INTO admin_sessions (token) VALUES ($1) ON CONFLICT DO NOTHING', [token])
}

export async function deleteAdminToken(token) {
  if (!token) return
  await query('DELETE FROM admin_sessions WHERE token = $1', [token])
}
