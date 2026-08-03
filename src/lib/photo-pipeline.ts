import { createId } from '@paralleldrive/cuid2'
import sharp from 'sharp'
import { db } from '@/db'
import { photos } from '@/db/schema'
import { deleteObject, putObject } from '@/lib/r2'

const FULL_WIDTH = 1920
const THUMB_WIDTH = 400

// What Sharp is allowed to have actually decoded. A declared MIME type is a
// client claim, and Sharp also reads SVG, so the allowlist is enforced here.
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp'])

/** Thrown when the bytes aren't a supported image; callers map it to 415. */
export class UnsupportedImageError extends Error {}

export type PhotoMetadata = {
  altText: string
  description: string
  tags: string[]
}

export type StorePhotoParams = {
  userId: string
  input: Buffer
  /** Hardcoded metadata. The seed passes this; the upload route doesn't. */
  metadata?: PhotoMetadata
  /**
   * Derives metadata from the generated thumbnail. The upload route passes
   * describeImage here; the seed passes nothing, so it structurally cannot
   * reach Anthropic (SPEC §9.1 — seeding stays free and deterministic).
   */
  deriveMetadata?: (thumbnail: Buffer) => Promise<PhotoMetadata>
}

/**
 * The one image pipeline: decode → rotate → two WebP renditions → R2 → row.
 * Shared by the upload route and the seed so there is never a second one.
 */
export async function processAndStorePhoto({
  userId,
  input,
  metadata,
  deriveMetadata,
}: StorePhotoParams) {
  let full: { data: Buffer; info: { width: number; height: number } }
  let thumb: Buffer

  try {
    const { format } = await sharp(input).metadata()
    if (!format || !ALLOWED_FORMATS.has(format)) {
      throw new UnsupportedImageError('Unsupported file type')
    }

    // .rotate() before .resize() so EXIF-rotated phone photos aren't sideways.
    // A pipeline can't be consumed twice, so each output gets its own instance.
    ;[full, thumb] = await Promise.all([
      sharp(input)
        .rotate()
        .resize(FULL_WIDTH, null, { withoutEnlargement: true })
        .webp()
        .toBuffer({ resolveWithObject: true }),
      sharp(input)
        .rotate()
        .resize(THUMB_WIDTH, null, { withoutEnlargement: true })
        .webp()
        .toBuffer(),
    ])
  } catch (cause) {
    if (cause instanceof UnsupportedImageError) throw cause
    throw new UnsupportedImageError('That file could not be read as an image')
  }

  const id = createId()
  // Server-generated cuid, no user-supplied path segment — no traversal.
  const storageKey = `photos/${userId}/${id}`
  const fullKey = `${storageKey}.webp`
  const thumbKey = `${storageKey}_thumb.webp`

  await Promise.all([
    putObject(fullKey, full.data, 'image/webp'),
    putObject(thumbKey, thumb, 'image/webp'),
  ])

  // Awaited, never fire-and-forget: serverless freezes the function the moment
  // the response is returned, so a floating promise silently loses the
  // metadata (SPEC §4.1). describeImage swallows its own errors.
  const derived = deriveMetadata ? await deriveMetadata(thumb) : undefined

  try {
    // Dimensions of what is actually stored: post-rotate, post-resize.
    const [photo] = await db
      .insert(photos)
      .values({
        id,
        userId,
        storageKey,
        width: full.info.width,
        height: full.info.height,
        ...(derived ?? metadata ?? {}),
      })
      .returning()

    return photo
  } catch (cause) {
    // Don't leave two objects behind with no row pointing at them.
    await Promise.allSettled([deleteObject(fullKey), deleteObject(thumbKey)])
    throw cause
  }
}
