import { and, count, eq } from 'drizzle-orm'
import { AlbumRow } from '@/components/AlbumRow'
import { CreateAlbumForm } from '@/components/CreateAlbumForm'
import { SearchForm } from '@/components/SearchForm'
import { TagFilter } from '@/components/TagFilter'
import { db } from '@/db'
import { albums, photos } from '@/db/schema'
import { listTopTags } from '@/lib/gallery-data'

type AlbumSidebarProps = {
  userId: string
}

export async function AlbumSidebar({ userId }: AlbumSidebarProps) {
  // One grouped query for every album's count — never a count per album. The
  // LEFT JOIN keeps empty albums in the result, and the join predicate carries
  // the ownership check so a photo can only ever count toward its own owner.
  const [rows, [totals], topTags] = await Promise.all([
    db
      .select({
        id: albums.id,
        name: albums.name,
        photoCount: count(photos.id),
      })
      .from(albums)
      .leftJoin(
        photos,
        and(eq(photos.albumId, albums.id), eq(photos.userId, userId)),
      )
      .where(eq(albums.userId, userId))
      .groupBy(albums.id, albums.name)
      .orderBy(albums.name),

    // "All photos" needs its own scalar count: photos with a null albumId are
    // absent from the grouped result by construction.
    db.select({ total: count() }).from(photos).where(eq(photos.userId, userId)),

    listTopTags(userId),
  ])

  return (
    <aside className="md:w-48 md:shrink-0">
      <nav aria-label="Albums">
        <h2 className="px-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Albums
        </h2>
        <ul className="space-y-0.5">
          <AlbumRow
            href="/"
            name="All photos"
            photoCount={totals?.total ?? 0}
          />
          {rows.map((album) => (
            <AlbumRow
              key={album.id}
              href={`/albums/${album.id}`}
              name={album.name}
              photoCount={album.photoCount}
              albumId={album.id}
            />
          ))}
        </ul>
      </nav>
      <CreateAlbumForm />
      <SearchForm />
      <TagFilter tags={topTags} />
    </aside>
  )
}
