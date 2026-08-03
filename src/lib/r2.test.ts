import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { publicUrl } from './r2'

const R2_ENV = {
  R2_ACCOUNT_ID: 'test-account',
  R2_ACCESS_KEY_ID: 'test-key',
  R2_SECRET_ACCESS_KEY: 'test-secret',
  R2_BUCKET: 'test-bucket',
  R2_PUBLIC_URL: 'https://pub-test.r2.dev',
} as const

const original = { ...process.env }

beforeEach(() => {
  Object.assign(process.env, R2_ENV)
})

afterEach(() => {
  process.env = { ...original }
})

describe('publicUrl', () => {
  it('derives the full-size URL', () => {
    expect(publicUrl('photos/user1/abc', 'full')).toBe(
      'https://pub-test.r2.dev/photos/user1/abc.webp',
    )
  })

  it('derives the thumbnail URL', () => {
    expect(publicUrl('photos/user1/abc', 'thumb')).toBe(
      'https://pub-test.r2.dev/photos/user1/abc_thumb.webp',
    )
  })

  it('does not double the slash when the base URL has a trailing one', () => {
    process.env.R2_PUBLIC_URL = 'https://pub-test.r2.dev/'

    expect(publicUrl('photos/user1/abc', 'full')).toBe(
      'https://pub-test.r2.dev/photos/user1/abc.webp',
    )
  })

  it('names every missing variable in one error', () => {
    delete process.env.R2_BUCKET
    delete process.env.R2_PUBLIC_URL

    expect(() => publicUrl('photos/user1/abc', 'full')).toThrow(
      /Missing R2 environment variables: R2_BUCKET, R2_PUBLIC_URL/,
    )
  })
})
