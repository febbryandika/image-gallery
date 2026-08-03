import { count, desc, eq } from 'drizzle-orm'
import Link from 'next/link'
import { EmptyGallery } from '@/components/EmptyGallery'
import { PhotoGrid } from '@/components/PhotoGrid'
import { Button } from '@/components/ui/button'
import { db } from '@/db'
import { photos } from '@/db/schema'
import { requireSession } from '@/lib/auth'
import type { PhotoView } from '@/lib/photo-view'
import { publicUrl } from '@/lib/r2'

export const PAGE_SIZE = 60

function parsePage(raw: string | string[] | undefined): number {
  const value = Number(Array.isArray(raw) ? raw[0] : raw)
  return Number.isInteger(value) && value > 0 ? value : 1
}

export default async function GalleryPage({ searchParams }: PageProps<'/'>) {
  // The layout guard is UX; this re-derives the id so the query is scoped.
  const session = await requireSession()
  const userId = session.user.id

  const [totals] = await db
    .select({ total: count() })
    .from(photos)
    .where(eq(photos.userId, userId))

  const total = totals?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(parsePage((await searchParams).page), totalPages)

  const rows = await db
    .select()
    .from(photos)
    .where(eq(photos.userId, userId))
    .orderBy(desc(photos.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE)

  const items: PhotoView[] = rows.map((row) => ({
    id: row.id,
    thumbUrl: publicUrl(row.storageKey, 'thumb'),
    fullUrl: publicUrl(row.storageKey, 'full'),
    altText: row.altText,
    description: row.description,
    tags: row.tags,
    width: row.width,
    height: row.height,
  }))

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Photos</h1>
        {total > 0 ? (
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? 'photo' : 'photos'}
          </p>
        ) : null}
      </div>

      {items.length === 0 ? <EmptyGallery /> : <PhotoGrid photos={items} />}

      {totalPages > 1 ? (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between gap-4"
        >
          {/* Rendered only when they lead somewhere — a disabled link is a
              worse experience than no link at all. */}
          <div className="min-w-24">
            {page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/?page=${page - 1}`}>Previous</Link>
              </Button>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex min-w-24 justify-end">
            {page < totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/?page=${page + 1}`}>Next</Link>
              </Button>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  )
}
