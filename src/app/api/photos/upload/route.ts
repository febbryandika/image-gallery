import { createId } from '@paralleldrive/cuid2'
import { count, eq } from 'drizzle-orm'
import sharp from 'sharp'
import { db } from '@/db'
import { photos } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { deleteObject, putObject } from '@/lib/r2'
import {
  ALLOWED_UPLOAD_TYPES,
  MAX_PHOTOS_PER_ACCOUNT,
  MAX_UPLOAD_BYTES,
} from '@/lib/validation'

// Sharp needs the Node runtime; the default edge runtime won't do (SPEC §4.1).
export const runtime = 'nodejs'

const FULL_WIDTH = 1920
const THUMB_WIDTH = 400

// What Sharp is allowed to have actually decoded. The declared MIME type is a
// client claim; Sharp also reads SVG, so the allowlist is enforced twice.
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp'])

function error(message: string, status: number): Response {
  return Response.json({ error: message }, { status })
}

export async function POST(req: Request): Promise<Response> {
  // Not requireSession(): that redirects, and this endpoint always answers JSON.
  const session = await getSession()
  if (!session) return error('Not signed in', 401)

  const file = (await req.formData()).get('file')

  if (!(file instanceof File)) return error('No file provided', 400)

  const allowedTypes: readonly string[] = ALLOWED_UPLOAD_TYPES
  if (!allowedTypes.includes(file.type)) {
    return error('Unsupported file type', 415)
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return error('File must be under 4MB', 413)
  }

  const userId = session.user.id

  // Before any Sharp work — a full account shouldn't burn CPU.
  const [existing] = await db
    .select({ total: count() })
    .from(photos)
    .where(eq(photos.userId, userId))

  if ((existing?.total ?? 0) >= MAX_PHOTOS_PER_ACCOUNT) {
    return error(
      `You've reached the limit of ${MAX_PHOTOS_PER_ACCOUNT} photos. Delete one to upload another.`,
      409,
    )
  }

  const input = Buffer.from(await file.arrayBuffer())

  let full: { data: Buffer; info: { width: number; height: number } }
  let thumb: Buffer
  try {
    const { format } = await sharp(input).metadata()
    if (!format || !ALLOWED_FORMATS.has(format)) {
      return error('Unsupported file type', 415)
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
  } catch {
    return error('That file could not be read as an image', 415)
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

  let photo
  try {
    // Dimensions of what is actually stored: post-rotate, post-resize.
    ;[photo] = await db
      .insert(photos)
      .values({
        id,
        userId,
        storageKey,
        width: full.info.width,
        height: full.info.height,
      })
      .returning()
  } catch (cause) {
    // Don't leave two objects behind with no row pointing at them.
    await Promise.allSettled([deleteObject(fullKey), deleteObject(thumbKey)])
    throw cause
  }

  return Response.json(photo, { status: 201 })
}
