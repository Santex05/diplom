import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeGenreKey, genreLabel } from '../src/constants/genres.js'

test('normalizeGenreKey maps lowercase english to canonical key', () => {
  assert.equal(normalizeGenreKey('action'), 'Action')
  assert.equal(normalizeGenreKey('fantasy'), 'Fantasy')
})

test('normalizeGenreKey maps russian label to canonical key', () => {
  assert.equal(normalizeGenreKey('Экшен'), 'Action')
})

test('genreLabel returns russian label for canonical key', () => {
  assert.equal(genreLabel('Action'), 'Экшен')
})

test('parseGenresParam logic via normalizeGenreKey (comma-separated URL param)', () => {
  const param = 'action, fantasy'
  const genres = param
    .split(',')
    .map((s) => normalizeGenreKey(s.trim()))
    .filter(Boolean)
  assert.deepEqual(genres, ['Action', 'Fantasy'])
})
