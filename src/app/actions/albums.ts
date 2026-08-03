'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import type { z } from 'zod'
import { db } from '@/db'
import { albums } from '@/db/schema'
import { requireSession } from '@/lib/auth'
import { albumNameSchema } from '@/lib/validation'

export type AlbumResult = { ok: true } | { ok: false; error: string }

/**
 * The sidebar lives in the (app) layout, so an album mutation changes the shell
 * on every route under it — counts included. Revalidating the layout is what
 * keeps the page the user is currently looking at from showing a stale count.
 */
function revalidateAlbums(): void {
  revalidatePath('/', 'layout')
}

/** The schema's own message, so the form says which rule was broken. */
function nameError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'That album name is not valid.'
}

export async function createAlbum(name: string): Promise<AlbumResult> {
  const session = await requireSession()

  const parsed = albumNameSchema.safeParse(name)
  if (!parsed.success) {
    return { ok: false, error: nameError(parsed.error) }
  }

  // userId comes from the session, never from the caller.
  await db.insert(albums).values({ userId: session.user.id, name: parsed.data })

  revalidateAlbums()
  return { ok: true }
}

export async function renameAlbum(
  id: string,
  name: string,
): Promise<AlbumResult> {
  const session = await requireSession()

  const parsed = albumNameSchema.safeParse(name)
  if (!parsed.success) {
    return { ok: false, error: nameError(parsed.error) }
  }

  const renamed = await db
    .update(albums)
    .set({ name: parsed.data })
    // Never `id` alone — ownership is re-checked on every mutation (SPEC §7).
    .where(and(eq(albums.id, id), eq(albums.userId, session.user.id)))
    .returning({ id: albums.id })

  if (renamed.length === 0) {
    return { ok: false, error: 'That album no longer exists.' }
  }

  revalidateAlbums()
  return { ok: true }
}

/**
 * Deletes the album only. Its photos survive: `photos.album_id` is declared
 * `onDelete: 'set null'` (SPEC §3), so Postgres detaches them and they reappear
 * under "All photos". Do not add an UPDATE here — it would be redundant.
 */
export async function deleteAlbum(id: string): Promise<AlbumResult> {
  const session = await requireSession()

  const deleted = await db
    .delete(albums)
    .where(and(eq(albums.id, id), eq(albums.userId, session.user.id)))
    .returning({ id: albums.id })

  if (deleted.length === 0) {
    return { ok: false, error: 'That album no longer exists.' }
  }

  revalidateAlbums()
  return { ok: true }
}
