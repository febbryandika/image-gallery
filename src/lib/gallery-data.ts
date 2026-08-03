/**
 * The reads the gallery and the album page share. Server-only: it reaches for
 * publicUrl, and `@/lib/r2` must never cross the client boundary.
 */

import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { albums, photos } from '@/db/schema'
import type { AlbumOption, PhotoView } from '@/lib/photo-view'
import { publicUrl } from '@/lib/r2'

/** The album names a move menu offers. Scoped, like every other query. */
export async function listAlbumOptions(userId: string): Promise<AlbumOption[]> {
  return db
    .select({ id: albums.id, name: albums.name })
    .from(albums)
    .where(eq(albums.userId, userId))
    .orderBy(asc(albums.name))
}

/** A row narrowed to what a Client Component may know (see photo-view.ts). */
export function toPhotoView(row: typeof photos.$inferSelect): PhotoView {
  return {
    id: row.id,
    thumbUrl: publicUrl(row.storageKey, 'thumb'),
    fullUrl: publicUrl(row.storageKey, 'full'),
    altText: row.altText,
    description: row.description,
    tags: row.tags,
    width: row.width,
    height: row.height,
    albumId: row.albumId,
  }
}
