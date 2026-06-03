/** Минимальная задержка, чтобы индикатор загрузки был заметен (как на продакшен-сайтах). */
export function minDelay(ms, promise) {
  return Promise.all([promise, new Promise((r) => setTimeout(r, ms))]).then(([result]) => result)
}
