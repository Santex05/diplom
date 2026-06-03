import { minDelay } from './minDelay'

/** Кэш ответов API: меньше запросов к серверу при переходах по сайту */
const store = new Map()

export const CACHE_TTL = {
  catalog: 45_000,
  anime: 30_000,
  banners: 60_000,
  collection: 20_000,
}

export const LOAD_MIN_MS = 650

/**
 * @param {string} key
 * @param {() => Promise<T>} fetcher
 * @param {{ ttl?: number, force?: boolean, minDisplayMs?: number }} [opts]
 * @returns {Promise<T>}
 */
export async function cachedFetch(key, fetcher, opts = {}) {
  const ttl = opts.ttl ?? CACHE_TTL.catalog
  const force = Boolean(opts.force)
  const minDisplayMs = opts.minDisplayMs ?? LOAD_MIN_MS
  const now = Date.now()
  const entry = store.get(key)

  if (!force && entry?.data != null && now - entry.fetchedAt < ttl) {
    return minDelay(minDisplayMs, Promise.resolve(entry.data))
  }

  if (!force && entry?.promise) {
    return entry.promise
  }

  const run = minDelay(minDisplayMs, fetcher())
    .then((data) => {
      store.set(key, { data, fetchedAt: Date.now(), promise: null })
      return data
    })
    .catch((err) => {
      const cur = store.get(key)
      if (cur?.promise === promise) {
        store.delete(key)
      }
      throw err
    })

  const promise = run
  store.set(key, { ...(entry || {}), promise })
  return promise
}

export function invalidateCache(prefix) {
  if (!prefix) {
    store.clear()
    return
  }
  for (const key of store.keys()) {
    if (key === prefix || key.startsWith(`${prefix}:`)) {
      store.delete(key)
    }
  }
}

export function getCacheAge(key) {
  const entry = store.get(key)
  if (!entry?.fetchedAt) return Infinity
  return Date.now() - entry.fetchedAt
}

export function isCacheFresh(key, ttl) {
  return getCacheAge(key) < ttl
}

/** Не чаще одного раза в intervalMs (для фоновых обновлений) */
export function createCooldown(intervalMs) {
  let lastRun = 0
  return {
    tryRun(fn) {
      const now = Date.now()
      if (now - lastRun < intervalMs) return false
      lastRun = now
      fn()
      return true
    },
    reset() {
      lastRun = 0
    },
  }
}

export function debounce(fn, ms) {
  let timer = null
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}
