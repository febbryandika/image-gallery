import { describe, expect, it } from 'vitest'
import {
  credentialsSchema,
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_PHOTO,
  normalizeTags,
} from './validation'

describe('normalizeTags', () => {
  it('lowercases and trims', () => {
    expect(normalizeTags(['  Sunset ', 'BEACH'])).toEqual(['sunset', 'beach'])
  })

  it('dedupes entries that collide only after normalizing', () => {
    expect(normalizeTags(['Coffee', 'coffee', '  COFFEE  '])).toEqual([
      'coffee',
    ])
  })

  it('drops empty and whitespace-only entries', () => {
    expect(normalizeTags(['', '   ', 'real'])).toEqual(['real'])
  })

  it(`truncates a tag longer than ${MAX_TAG_LENGTH} characters`, () => {
    const [tag] = normalizeTags(['a'.repeat(40)])

    expect(tag).toHaveLength(MAX_TAG_LENGTH)
  })

  it('does not leave trailing whitespace after truncating mid-word', () => {
    const [tag] = normalizeTags([`${'a'.repeat(29)} bcdef`])

    expect(tag).toBe('a'.repeat(29))
  })

  it(`caps the list at ${MAX_TAGS_PER_PHOTO}`, () => {
    const many = Array.from({ length: 12 }, (_, index) => `tag${index}`)

    expect(normalizeTags(many)).toHaveLength(MAX_TAGS_PER_PHOTO)
  })

  it('counts duplicates against the cap only once', () => {
    const withDupes = ['a', 'a', 'b', 'b', 'c', 'c', 'd', 'd', 'e', 'e']

    expect(normalizeTags(withDupes)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('returns an empty array for an empty input', () => {
    expect(normalizeTags([])).toEqual([])
  })
})

describe('credentialsSchema', () => {
  it('accepts a well-formed email and an 8-character password', () => {
    const result = credentialsSchema.safeParse({
      email: 'demo@example.com',
      password: 'demo1234',
    })

    expect(result.success).toBe(true)
  })

  it('rejects a malformed email', () => {
    const result = credentialsSchema.safeParse({
      email: 'not-an-email',
      password: 'demo1234',
    })

    expect(result.success).toBe(false)
  })

  it('rejects a password under 8 characters', () => {
    const result = credentialsSchema.safeParse({
      email: 'demo@example.com',
      password: 'demo123',
    })

    expect(result.success).toBe(false)
  })
})
