/**
 * The reads the gallery and the album page share. Server-only: it reaches for
 * publicUrl, and `@/lib/r2` must never cross the client boundary.
 */

import { and, asc, eq, ilike, sql, type SQL } from 'drizzle-orm'
import { db } from '@/db'
import { albums, photos } from '@/db/schema'
import type { PhotoFilters } from '@/lib/filters'
import type { AlbumOption, PhotoView } from '@/lib/photo-view'
import { publicUrl } from '@/lib/r2'

/**
 * `%` and `_` are wildcards to LIKE. Drizzle already binds the whole pattern as
 * one parameter, so this is not an injection fix — it stops someone searching
 * for "100%" from matching every photo they own.
 */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

/**
 * The one place the grid's WHERE clause is built, so ownership scoping and the
 * filters can never drift apart between the two routes.
 *
 * Both user values go through drizzle's parameter binding — neither the tag nor
 * the search text is ever interpolated into SQL text (SPEC §7).
 */
export function photoConditions(
  userId: string,
  filters: PhotoFilters,
  albumId?: string,
): SQL | undefined {
  const conditions: (SQL | undefined)[] = [
    // Always. Never `id` alone, never an unscoped read.
    eq(photos.userId, userId),
    albumId === undefined ? undefined : eq(photos.albumId, albumId),
    filters.tag === null
      ? undefined
      : sql`${filters.tag} = ANY(${photos.tags})`,
    // Alt text only — description and tags are deliberately not searched.
    filters.q === ''
      ? undefined
      : ilike(photos.altText, `%${escapeLike(filters.q)}%`),
  ]

  return and(...conditions)
}

/** The album names a move menu offers. Scoped, like every other query. */
export async function listAlbumOptions(userId: string): Promise<AlbumOption[]> {
  return db
    .select({ id: albums.id, name: albums.name })
    .from(albums)
    .where(eq(albums.userId, userId))
    .orderBy(asc(albums.name))
}

export type TagCount = { tag: string; count: number }

/** How many tags the sidebar offers before it becomes a wall of chips. */
const TOP_TAGS = 12

/**
 * The sidebar's tag list. A lateral `unnest` doesn't express in the query
 * builder, so this is raw SQL — with `userId` still bound as a parameter.
 *
 * Deliberately scoped to the user only, not to the current album or the active
 * filters: the layout can't see a child route's params, and a tag list that
 * reshuffles every time you click one is harder to use than one that stays put.
 */
export async function listTopTags(userId: string): Promise<TagCount[]> {
  const result = await db.execute<TagCount>(sql`
    select tag, count(*)::int as count
    from ${photos}, unnest(${photos.tags}) as tag
    where ${photos.userId} = ${userId}
    group by tag
    order by count desc, tag asc
    limit ${TOP_TAGS}
  `)

  return result.rows
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
