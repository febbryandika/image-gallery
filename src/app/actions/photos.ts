'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { photos } from '@/db/schema'
import { requireSession } from '@/lib/auth'
import { deleteObject } from '@/lib/r2'
import { albums } from '@/db/schema'
import {
  normalizeTags,
  reorderSchema,
  updatePhotoSchema,
  type UpdatePhotoInput,
} from '@/lib/validation'

export type UpdatePhotoResult = { ok: true } | { ok: false; error: string }
export type ReorderResult = { ok: true } | { ok: false; error: string }

/**
 * Edits the metadata the vision call produced. Tags are normalised here
 * regardless of what the client sent — the client's list is never trusted
 * (SPEC §7).
 */
export async function updatePhoto(
  id: string,
  input: UpdatePhotoInput,
): Promise<UpdatePhotoResult> {
  const session = await requireSession()
  const userId = session.user.id

  const parsed = updatePhotoSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Those values are not valid.' }
  }

  const { altText, description, tags, albumId } = parsed.data

  // An album id from the client is only accepted if this user owns it.
  if (albumId) {
    const [album] = await db
      .select({ id: albums.id })
      .from(albums)
      .where(and(eq(albums.id, albumId), eq(albums.userId, userId)))

    if (!album) return { ok: false, error: 'That album does not exist.' }
  }

  const updated = await db
    .update(photos)
    .set({
      altText,
      description,
      tags: normalizeTags(tags),
      ...(albumId === undefined ? {} : { albumId }),
    })
    // Never `id` alone.
    .where(and(eq(photos.id, id), eq(photos.userId, userId)))
    .returning({ id: photos.id })

  if (updated.length === 0) {
    return { ok: false, error: 'That photo no longer exists.' }
  }

  // The layout, so a move refreshes the source album, the destination album,
  // and the sidebar's counts — not just the grid the caller happens to be on.
  revalidatePath('/', 'layout')
  return { ok: true }
}

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

  // The layout too — the sidebar's counts are wrong until it re-renders.
  revalidatePath('/', 'layout')
}

/**
 * Rewrites an album's `position` column from the order the client dropped into.
 *
 * Plain integers, renumbered 0..n-1 in one transaction — not fractional
 * indexing. This gallery is single-user with tens of photos per album, so
 * rewriting the whole album is a handful of rows and removes a dependency plus
 * a class of key-collision bugs (SPEC §4.3).
 */
export async function reorderAlbum(
  albumId: string,
  orderedIds: string[],
): Promise<ReorderResult> {
  const session = await requireSession()
  const userId = session.user.id

  const parsed = reorderSchema.safeParse(orderedIds)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid order',
    }
  }

  // An album id from the client is only accepted if this user owns it.
  const [album] = await db
    .select({ id: albums.id })
    .from(albums)
    .where(and(eq(albums.id, albumId), eq(albums.userId, userId)))

  if (!album) return { ok: false, error: 'That album does not exist.' }

  await db.transaction(async (tx) => {
    await Promise.all(
      parsed.data.map((id, index) =>
        tx
          .update(photos)
          .set({ position: index })
          // Never `id` alone, and never outside this album: an id belonging to
          // someone else — or to a different album — matches zero rows rather
          // than being renumbered.
          .where(
            and(
              eq(photos.id, id),
              eq(photos.userId, userId),
              eq(photos.albumId, albumId),
            ),
          ),
      ),
    )
  })

  revalidatePath(`/albums/${albumId}`)
  return { ok: true }
}
