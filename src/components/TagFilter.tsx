'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { filterHref, parseFilters, type RawSearchParams } from '@/lib/filters'
import type { TagCount } from '@/lib/gallery-data'

type TagFilterProps = {
  tags: TagCount[]
}

/**
 * A Client Component only because the sidebar lives in the (app) layout, and
 * layouts are not given searchParams — the counts themselves come from a
 * Server Component query. These are real links: clicking one is a navigation,
 * and the active tag links back to the cleared URL so it toggles off.
 */
export function TagFilter({ tags }: TagFilterProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (tags.length === 0) return null

  const filters = parseFilters(
    Object.fromEntries(searchParams) as RawSearchParams,
  )

  return (
    <nav aria-label="Filter by tag" className="mt-6">
      <h2 className="px-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Tags
      </h2>
      <ul className="flex flex-wrap gap-1 px-2">
        {tags.map(({ tag, count }) => {
          const isActive = filters.tag === tag

          return (
            <li key={tag}>
              <Link
                href={filterHref(pathname, filters, {
                  tag: isActive ? null : tag,
                })}
                aria-current={isActive ? 'true' : undefined}
                className="rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Badge variant={isActive ? 'default' : 'secondary'}>
                  {tag}
                  <span className="ml-1 tabular-nums opacity-70">{count}</span>
                  {isActive ? <span className="sr-only"> — remove</span> : null}
                </Badge>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
