import { count, eq } from 'drizzle-orm'
import { db } from '@/db'
import { photos } from '@/db/schema'
import { getSession } from '@/lib/auth'
import {
  processAndStorePhoto,
  UnsupportedImageError,
} from '@/lib/photo-pipeline'
import {
  ALLOWED_UPLOAD_TYPES,
  MAX_PHOTOS_PER_ACCOUNT,
  MAX_UPLOAD_BYTES,
} from '@/lib/validation'

// Sharp needs the Node runtime; the default edge runtime won't do (SPEC §4.1).
export const runtime = 'nodejs'

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

  try {
    const photo = await processAndStorePhoto({
      userId,
      input: Buffer.from(await file.arrayBuffer()),
    })
    return Response.json(photo, { status: 201 })
  } catch (cause) {
    if (cause instanceof UnsupportedImageError) return error(cause.message, 415)
    throw cause
  }
}
