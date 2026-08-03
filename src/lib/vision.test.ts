import { beforeEach, describe, expect, it, vi } from 'vitest'

const { generateObject } = vi.hoisted(() => ({ generateObject: vi.fn() }))

vi.mock('ai', () => ({ generateObject }))
vi.mock('@ai-sdk/anthropic', () => ({ anthropic: (id: string) => ({ id }) }))

const { describeImage } = await import('./vision')

const THUMB = Buffer.from('not-really-a-webp')

beforeEach(() => {
  vi.clearAllMocks()
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
})
