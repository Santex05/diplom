import pg from 'pg'

const { Pool } = pg

let pool = null

export function isPgEnabled() {
  return Boolean(process.env.DATABASE_URL?.trim())
}

export function getPool() {
  if (!isPgEnabled()) {
    throw new Error('DATABASE_URL не задан')
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30_000,
    })
    pool.on('error', (err) => {
      console.error('[postgres]', err)
    })
  }
  return pool
}

export async function closePool() {
  if (pool) {
    await pool.end()
    pool = null
  }
}

export async function query(text, params) {
  return getPool().query(text, params)
}
