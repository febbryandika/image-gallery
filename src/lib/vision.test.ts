import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_ALT_TEXT_LENGTH } from './validation'

const { generateObject } = vi.hoisted(() => ({ generateObject: vi.fn() }))

vi.mock('ai', () => ({ generateObject }))
vi.mock('@ai-sdk/anthropic', () => ({ anthropic: (id: string) => ({ id }) }))

const { describeImage } = await import('./vision')

const THUMB = Buffer.from('not-really-a-webp')

beforeEach(() => {
  vi.clearAllMocks()
  // These tests are about the real call. VISION_STUB short-circuits it, so an
  // ambient one — a developer's shell, a mis-scoped CI env — would quietly
  // make every assertion below meaningless.
  vi.stubEnv('VISION_STUB', '')
})

describe('describeImage', () => {
  it('returns empty metadata instead of throwing when the SDK rejects', async () => {
    generateObject.mockRejectedValue(new Error('401 invalid x-api-key'))

    await expect(describeImage(THUMB)).resolves.toEqual({
      altText: '',
      description: '',
      tags: [],
    })
  })

  it('does not throw when the SDK returns a malformed object', async () => {
    generateObject.mockResolvedValue({ object: null })

    await expect(describeImage(THUMB)).resolves.toEqual({
      altText: '',
      description: '',
      tags: [],
    })
  })

  it('normalizes tags on the success path', async () => {
    generateObject.mockResolvedValue({
      object: {
        altText: 'A red bicycle leaning on a wall',
        description: 'A bicycle parked in afternoon sun.',
        tags: ['  Bicycle ', 'BICYCLE', 'Red', '', 'street'],
      },
    })

    const result = await describeImage(THUMB)

    expect(result.altText).toBe('A red bicycle leaning on a wall')
    expect(result.tags).toEqual(['bicycle', 'red', 'street'])
  })

  // Regression: the generation schema used to carry .max(125), so a model that
  // overshot by a few characters failed validation and the whole description
  // was thrown away. Length is trimmed here instead of discarded.
  it('trims over-long alt text at a word boundary instead of losing it', async () => {
    const long =
      'Minimalist sunset with glowing sun on horizon, gradient sky transitioning from deep blue to orange and yellow above dark ground'

    generateObject.mockResolvedValue({
      object: { altText: long, description: 'A sunset.', tags: ['sunset'] },
    })

    const result = await describeImage(THUMB)

    expect(long.length).toBeGreaterThan(MAX_ALT_TEXT_LENGTH)
    expect(result.altText.length).toBeLessThanOrEqual(MAX_ALT_TEXT_LENGTH)
    expect(result.altText).not.toBe('')
    // Trimmed at a space, so it doesn't end mid-word.
    expect(long.startsWith(result.altText)).toBe(true)
    expect(result.altText).not.toMatch(/[\s,;:]$/)
  })

  it('leaves alt text under the limit untouched', async () => {
    generateObject.mockResolvedValue({
      object: { altText: 'A short caption', description: 'd', tags: [] },
    })

    await expect(describeImage(THUMB)).resolves.toMatchObject({
      altText: 'A short caption',
    })
  })

  it('sends the thumbnail bytes as a file part, not a URL', async () => {
    generateObject.mockResolvedValue({
      object: { altText: 'x', description: 'y', tags: [] },
    })

    await describeImage(THUMB)

    const call = generateObject.mock.calls[0]?.[0]
    expect(call.messages[0].content[0]).toMatchObject({
      type: 'file',
      mediaType: 'image/webp',
      data: THUMB,
    })
  })

  describe('VISION_STUB', () => {
    it('returns fixed metadata without calling the model at all', async () => {
      vi.stubEnv('VISION_STUB', 'true')

      const result = await describeImage(THUMB)

      // The point of the flag: CI needs no key and spends nothing.
      expect(generateObject).not.toHaveBeenCalled()
      expect(result.altText).not.toBe('')
      expect(result.tags.length).toBeGreaterThan(0)
    })

    it('is off unless the value is exactly "true"', async () => {
      vi.stubEnv('VISION_STUB', '1')
      generateObject.mockResolvedValue({
        object: { altText: 'real', description: 'real', tags: [] },
      })

      await describeImage(THUMB)

      expect(generateObject).toHaveBeenCalledOnce()
    })
  })
})
