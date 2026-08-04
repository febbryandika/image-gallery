import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { PhotoFilters } from '@/lib/filters'

type EmptyFilteredProps = {
  filters: PhotoFilters
  /** Where "Clear filters" goes — the same route with nothing applied. */
  clearHref: string
}

/** Names the filter that came up empty, rather than a generic "no results". */
function describe({ tag, q }: PhotoFilters): React.ReactNode {
  if (tag && q) {
    return (
      <>
        No photos tagged <code>{tag}</code> match “{q}”
      </>
    )
  }
  if (tag) {
    return (
      <>
        No photos tagged <code>{tag}</code>
      </>
    )
  }
  return <>No photos match “{q}”</>
}

export function EmptyFiltered({ filters, clearHref }: EmptyFilteredProps) {
  return (
    <div className="rounded-lg border border-dashed px-6 py-16 text-center">
      <h2 className="text-lg font-medium">{describe(filters)}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Try a different tag, or search for something else.
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link href={clearHref}>Clear filters</Link>
      </Button>
    </div>
  )
}
