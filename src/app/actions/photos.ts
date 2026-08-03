'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { photos } from '@/db/schema'
import { requireSession } from '@/lib/auth'
import { deleteObject } from '@/lib/r2'

/**
 * Removes both R2 objects, then the row. That order is deliberate: a failed row
 * delete leaves a visibly broken thumbnail, which is fixable, where the reverse
 * leaves objects nothing points at.
 */
export async function deletePhoto(id: string): Promise<void> {
  const session = await requireSession()

  // Never `id` alone — ownership is re-checked on every mutation (SPEC §7).
  const owned = and(eq(photos.id, id), eq(photos.userId, session.user.id))

  const [photo] = await db
    .select({ storageKey: photos.storageKey })
    .from(photos)
    .where(owned)

  if (!photo) return

  await Promise.all([
    deleteObject(`${photo.storageKey}.webp`),
    deleteObject(`${photo.storageKey}_thumb.webp`),
  ])

  await db.delete(photos).where(owned)

  revalidatePath('/')
}
