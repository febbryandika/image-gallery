import { count, desc } from 'drizzle-orm'
import Link from 'next/link'
import { EmptyFiltered } from '@/components/EmptyFiltered'
import { EmptyGallery } from '@/components/EmptyGallery'
import { PhotoGrid } from '@/components/PhotoGrid'
import { Button } from '@/components/ui/button'
import { db } from '@/db'
import { photos } from '@/db/schema'
import { requireSession } from '@/lib/auth'
import { filterHref, hasActiveFilter, parseFilters } from '@/lib/filters'
import {
  listAlbumOptions,
  photoConditions,
  toPhotoView,
} from '@/lib/gallery-data'

export const PAGE_SIZE = 60

export default async function GalleryPage({ searchParams }: PageProps<'/'>) {
  // The layout guard is UX; this re-derives the id so the query is scoped.
  const session = await requireSession()
  const userId = session.user.id

  const filters = parseFilters(await searchParams)
  const where = photoConditions(userId, filters)

  // Counted through the same conditions, so the page count reflects the filter.
  const [totals] = await db.select({ total: count() }).from(photos).where(where)

  const total = totals?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(filters.page, totalPages)

  const [rows, albumOptions] = await Promise.all([
    db
      .select()
      .from(photos)
      .where(where)
      .orderBy(desc(photos.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    listAlbumOptions(userId),
  ])

  const items = rows.map(toPhotoView)
  const filtered = hasActiveFilter(filters)

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Photos</h1>
        {total > 0 ? (
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? 'photo' : 'photos'}
            {filtered ? ' found' : null}
          </p>
        ) : null}
      </div>

      {items.length === 0 ? (
        // An empty gallery and an empty filter are different problems, and the
        // second one needs a way out (SPEC §5.1).
        filtered ? (
          <EmptyFiltered filters={filters} clearHref="/" />
        ) : (
          <EmptyGallery />
        )
      ) : (
        <PhotoGrid photos={items} albums={albumOptions} />
      )}

      {totalPages > 1 ? (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between gap-4"
        >
          {/* Rendered only when they lead somewhere — a disabled link is a
              worse experience than no link at all. Both carry the filters. */}
          <div className="min-w-24">
            {page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={filterHref('/', filters, { page: page - 1 })}>
                  Previous
                </Link>
              </Button>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex min-w-24 justify-end">
            {page < totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={filterHref('/', filters, { page: page + 1 })}>
                  Next
                </Link>
              </Button>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  )
}
