import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeEpisodeSources,
  sortSourcesByQuality,
  computeWatchStats,
  normalizeFileRef,
} from '../episodeSources.js'

test('normalizeFileRef replaces backslashes', () => {
  assert.equal(normalizeFileRef('foo\\bar.mp4'), 'foo/bar.mp4')
})

test('normalizeEpisodeSources from legacy file field', () => {
  const sources = normalizeEpisodeSources({ file: 'ep01.mp4' })
  assert.deepEqual(sources, [{ quality: 'Оригинал', file: 'ep01.mp4' }])
})

test('normalizeEpisodeSources keeps multi-quality sources', () => {
  const sources = normalizeEpisodeSources({
    sources: [
      { quality: '720p', file: 'ep01-720.mp4' },
      { quality: '1080p', file: 'ep01-1080.mp4' },
    ],
  })
  assert.equal(sources.length, 2)
  assert.equal(sources[0].quality, '720p')
})

test('sortSourcesByQuality orders 1080p before 720p', () => {
  const sorted = sortSourcesByQuality([
    { quality: '720p', file: 'a.mp4' },
    { quality: '1080p', file: 'b.mp4' },
  ])
  assert.equal(sorted[0].quality, '1080p')
})

test('computeWatchStats averages episode duration', () => {
  const stats = computeWatchStats([
    { durationSeconds: 1200 },
    { durationSeconds: 1800 },
  ])
  assert.equal(stats.episodeDurationSeconds, 1500)
  assert.equal(stats.totalWatchSeconds, 3000)
})
