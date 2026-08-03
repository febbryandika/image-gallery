import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_UPLOAD_BYTES } from '@/lib/validation'

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }))
const { putObject, deleteObject } = vi.hoisted(() => ({
  putObject: vi.fn(),
  deleteObject: vi.fn(),
}))
const { photoCount, insertedValues, insertShouldFail } = vi.hoisted(() => ({
  photoCount: { value: 0 },
  insertedValues: { value: null as Record<string, unknown> | null },
  insertShouldFail: { value: false },
}))
const { sharpMetadata, resizeInfo } = vi.hoisted(() => ({
  sharpMetadata: { format: 'jpeg' as string | undefined },
  resizeInfo: { width: 1920, height: 1080 },
}))

vi.mock('@/lib/auth', () => ({ getSession }))
vi.mock('@/lib/r2', () => ({ putObject, deleteObject }))

vi.mock('@/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => Promise.resolve([{ total: photoCount.value }]),
      }),
    }),
    insert: () => ({
      values: (values: Record<string, unknown>) => ({
        returning: () => {
          if (insertShouldFail.value) throw new Error('insert failed')
          insertedValues.value = values
          return Promise.resolve([{ id: values.id, ...values }])
        },
      }),
    }),
  },
}))

vi.mock('sharp', () => {
  const instance = () => ({
    metadata: () => {
      if (sharpMetadata.format === undefined) throw new Error('decode failed')
      return Promise.resolve({ format: sharpMetadata.format })
    },
    rotate: () => instance(),
    resize: () => instance(),
    webp: () => instance(),
    toBuffer: (options?: { resolveWithObject?: boolean }) =>
      Promise.resolve(
        options?.resolveWithObject
          ? { data: Buffer.from('full'), info: { ...resizeInfo } }
          : Buffer.from('thumb'),
      ),
  })
  return { default: instance }
})

const { POST } = await import('./route')

function request(file?: File): Request {
  const body = new FormData()
  if (file) body.set('file', file)
  return new Request('http://localhost/api/photos/upload', {
    method: 'POST',
    body,
  })
}

function jpeg(bytes = 100): File {
  return new File([new Uint8Array(bytes)], 'photo.jpg', { type: 'image/jpeg' })
}

beforeEach(() => {
  vi.clearAllMocks()
  getSession.mockResolvedValue({ user: { id: 'user-1' } })
  photoCount.value = 0
  insertedValues.value = null
  insertShouldFail.value = false
  sharpMetadata.format = 'jpeg'
  resizeInfo.width = 1920
  resizeInfo.height = 1080
})

describe('POST /api/photos/upload', () => {
  it('rejects an unauthenticated request with 401', async () => {
    getSession.mockResolvedValue(null)

    const response = await POST(request(jpeg()))

    expect(response.status).toBe(401)
    expect(putObject).not.toHaveBeenCalled()
  })

  it('rejects a request with no file with 400', async () => {
    expect((await POST(request())).status).toBe(400)
  })

  it('rejects a disallowed declared type with 415', async () => {
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' })

    const response = await POST(request(file))

    expect(response.status).toBe(415)
    expect(putObject).not.toHaveBeenCalled()
  })

  it('rejects a file over the size cap with 413', async () => {
    const response = await POST(request(jpeg(MAX_UPLOAD_BYTES + 1)))

    expect(response.status).toBe(413)
    expect(putObject).not.toHaveBeenCalled()
  })

  it('rejects with 409 once the account is at the photo cap', async () => {
    photoCount.value = 50

    const response = await POST(request(jpeg()))

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('50 photos'),
    })
    expect(putObject).not.toHaveBeenCalled()
  })

  it('rejects bytes that decode as a format outside the allowlist', async () => {
    // An SVG uploaded with a declared type of image/jpeg: Sharp decodes it,
    // so only the sniffed format catches it.
    sharpMetadata.format = 'svg'

    const response = await POST(request(jpeg()))

    expect(response.status).toBe(415)
    expect(putObject).not.toHaveBeenCalled()
  })

  it('rejects bytes Sharp cannot decode at all', async () => {
    sharpMetadata.format = undefined

    expect((await POST(request(jpeg()))).status).toBe(415)
  })

  it('stores both variants and records the resized dimensions', async () => {
    resizeInfo.width = 1080
    resizeInfo.height = 1920

    const response = await POST(request(jpeg()))

    expect(response.status).toBe(201)
    expect(putObject).toHaveBeenCalledTimes(2)

    const keys = putObject.mock.calls.map((call) => call[0])
    expect(keys).toEqual([
      expect.stringMatching(/^photos\/user-1\/[a-z0-9]+\.webp$/),
      expect.stringMatching(/^photos\/user-1\/[a-z0-9]+_thumb\.webp$/),
    ])
    expect(putObject.mock.calls.every((call) => call[2] === 'image/webp')).toBe(
      true,
    )

    // Post-rotate, post-resize — not the raw metadata dimensions.
    expect(insertedValues.value).toMatchObject({
      userId: 'user-1',
      width: 1080,
      height: 1920,
    })
    expect(deleteObject).not.toHaveBeenCalled()
  })

  it('removes both objects when the insert fails', async () => {
    insertShouldFail.value = true

    await expect(POST(request(jpeg()))).rejects.toThrow('insert failed')

    expect(putObject).toHaveBeenCalledTimes(2)
    expect(deleteObject).toHaveBeenCalledTimes(2)
  })
})
