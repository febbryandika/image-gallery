import { describe, expect, it } from 'vitest'
import { credentialsSchema } from './validation'

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
