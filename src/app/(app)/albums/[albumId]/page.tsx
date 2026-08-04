import { and, asc, desc, eq } from 'drizzle-orm'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EmptyAlbum } from '@/components/EmptyAlbum'
import { SortableGrid } from '@/components/SortableGrid'
import { db } from '@/db'
import { albums, photos } from '@/db/schema'
import { requireSession } from '@/lib/auth'
import { listAlbumOptions, toPhotoView } from '@/lib/gallery-data'

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
}: PageProps<'/albums/[albumId]'>) {
  // The layout guard is UX; this re-derives the id so the queries are scoped.
  const session = await requireSession()
  const userId = session.user.id
  const { albumId } = await params

  const album = await findOwnedAlbum(albumId, userId)
  if (!album) notFound()

  const [rows, albumOptions] = await Promise.all([
    db
      .select()
      .from(photos)
      .where(and(eq(photos.albumId, album.id), eq(photos.userId, userId)))
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
          </p>
        ) : null}
      </div>

      {items.length === 0 ? (
        <EmptyAlbum />
      ) : (
        <SortableGrid albumId={album.id} photos={items} albums={albumOptions} />
      )}
    </div>
  )
}
