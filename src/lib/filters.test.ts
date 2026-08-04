import { describe, expect, it } from 'vitest'
import { filterHref, hasActiveFilter, parseFilters } from './filters'

const NONE = parseFilters({})

describe('parseFilters', () => {
  it('defaults to page 1 with nothing filtered', () => {
    expect(NONE).toEqual({ tag: null, q: '', page: 1 })
  })

  it('takes the first value when a param is repeated', () => {
    expect(parseFilters({ tag: ['sunset', 'beach'] }).tag).toBe('sunset')
  })

  it('lowercases the tag, because that is how tags are stored', () => {
    expect(parseFilters({ tag: 'Sunset' }).tag).toBe('sunset')
  })

  it('treats a whitespace-only tag as no tag', () => {
    expect(parseFilters({ tag: '   ' }).tag).toBeNull()
  })

  it('trims the query but keeps its case', () => {
    expect(parseFilters({ q: '  Cafe  ' }).q).toBe('Cafe')
  })

  it('falls back to page 1 for a non-numeric page', () => {
    expect(parseFilters({ page: 'not-a-number' }).page).toBe(1)
  })

  it('falls back to page 1 for zero, negatives and fractions', () => {
    expect(parseFilters({ page: '0' }).page).toBe(1)
    expect(parseFilters({ page: '-3' }).page).toBe(1)
    expect(parseFilters({ page: '1.5' }).page).toBe(1)
  })
})

describe('hasActiveFilter', () => {
  it('is false when nothing is set', () => {
    expect(hasActiveFilter(NONE)).toBe(false)
  })

  it('is true for a tag or a query alone', () => {
    expect(hasActiveFilter({ ...NONE, tag: 'sunset' })).toBe(true)
    expect(hasActiveFilter({ ...NONE, q: 'cafe' })).toBe(true)
  })
})

describe('filterHref', () => {
  it('returns a bare path when nothing is set', () => {
    expect(filterHref('/', NONE)).toBe('/')
  })

  it('omits page 1', () => {
    expect(filterHref('/', { ...NONE, page: 1 })).toBe('/')
  })

  it('keeps the album route it was given', () => {
    expect(filterHref('/albums/abc', { ...NONE, tag: 'sunset' })).toBe(
      '/albums/abc?tag=sunset',
    )
  })

  it('preserves the query when the tag changes', () => {
    const current = { tag: 'beach', q: 'cafe', page: 1 }

    expect(filterHref('/', current, { tag: 'sunset' })).toBe(
      '/?tag=sunset&q=cafe',
    )
  })

  it('resets the page when the tag changes', () => {
    const current = { tag: null, q: '', page: 4 }

    expect(filterHref('/', current, { tag: 'sunset' })).toBe('/?tag=sunset')
  })

  it('resets the page when the query changes', () => {
    const current = { tag: null, q: '', page: 4 }

    expect(filterHref('/', current, { q: 'cafe' })).toBe('/?q=cafe')
  })

  it('keeps the filters when only the page changes', () => {
    const current = { tag: 'sunset', q: 'cafe', page: 2 }

    expect(filterHref('/', current, { page: 3 })).toBe(
      '/?tag=sunset&q=cafe&page=3',
    )
  })

  it('clears a tag when patched to null', () => {
    const current = { tag: 'sunset', q: 'cafe', page: 2 }

    expect(filterHref('/', current, { tag: null })).toBe('/?q=cafe')
  })

  it('encodes values rather than pasting them in raw', () => {
    expect(filterHref('/', NONE, { q: 'a&b=c d' })).toBe('/?q=a%26b%3Dc+d')
  })
})
