import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('lets a later Tailwind class win over an earlier conflicting one', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('drops falsy branches', () => {
    expect(cn('rounded', false && 'hidden', undefined)).toBe('rounded')
  })
})
