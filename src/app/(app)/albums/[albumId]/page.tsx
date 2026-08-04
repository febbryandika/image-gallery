import { and, asc, desc, eq } from 'drizzle-orm'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EmptyAlbum } from '@/components/EmptyAlbum'
import { EmptyFiltered } from '@/components/EmptyFiltered'
import { SortableGrid } from '@/components/SortableGrid'
import { db } from '@/db'
import { albums, photos } from '@/db/schema'
import { requireSession } from '@/lib/auth'
import { hasActiveFilter, parseFilters } from '@/lib/filters'
import {
  listAlbumOptions,
  photoConditions,
  toPhotoView,
} from '@/lib/gallery-data'

/** Never `id` alone — an album belonging to someone else must 404, not render. */
async function findOwnedAlbum(id: string, userId: string) {
  const [album] = await db
    .select({ id: albums.id, name: albums.name })
    .from(albums)
    .where(and(eq(albums.id, id), eq(albums.userId, userId)))

  return album
}

export async function generateMetadata({
  params,
}: PageProps<'/albums/[albumId]'>): Promise<Metadata> {
  const session = await requireSession()
  const { albumId } = await params
  const album = await findOwnedAlbum(albumId, session.user.id)

  return { title: album?.name ?? 'Album' }
}

export default async function AlbumPage({
  params,
  searchParams,
}: PageProps<'/albums/[albumId]'>) {
  // The layout guard is UX; this re-derives the id so the queries are scoped.
  const session = await requireSession()
  const userId = session.user.id
  const { albumId } = await params

  const album = await findOwnedAlbum(albumId, userId)
  if (!album) notFound()

  const filters = parseFilters(await searchParams)
  const filtered = hasActiveFilter(filters)

  const [rows, albumOptions] = await Promise.all([
    db
      .select()
      .from(photos)
      .where(photoConditions(userId, filters, album.id))
      // Ascending position is the order Phase 9's reorder writes. Every row
      // starts at 0, so createdAt breaks the ties newest-first, matching the
      // main grid.
      .orderBy(asc(photos.position), desc(photos.createdAt)),
    listAlbumOptions(userId),
  ])

  // No pagination: the 50-photo account cap is below the gallery's page size,
  // so an album can never overflow one page.
  const items = rows.map(toPhotoView)

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{album.name}</h1>
        {items.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? 'photo' : 'photos'}
            {filtered ? ' found' : null}
          </p>
        ) : null}
      </div>

      {items.length === 0 ? (
        filtered ? (
          <EmptyFiltered filters={filters} clearHref={`/albums/${album.id}`} />
        ) : (
          <EmptyAlbum />
        )
      ) : (
        <SortableGrid
          albumId={album.id}
          photos={items}
          albums={albumOptions}
          // Dropping inside a filtered subset would renumber `position` 0..n-1
          // for only the visible photos and silently corrupt the album's real
          // order, so reordering waits until the filter is cleared.
          reorderable={!filtered}
        />
      )}
    </div>
  )
}
