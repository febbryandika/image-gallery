'use client'

import { SearchIcon } from 'lucide-react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parseFilters, type RawSearchParams } from '@/lib/filters'

/**
 * A plain GET form: submitting navigates to the same route with `?q=`, so the
 * result is a shareable URL and the whole thing works without JavaScript, like
 * the login form. The active tag rides along in a hidden input; `page` is
 * deliberately dropped, because page 4 of the old results means nothing here.
 */
export function SearchForm() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const filters = parseFilters(
    Object.fromEntries(searchParams) as RawSearchParams,
  )

  return (
    <form
      // Remount on navigation so the field shows what the URL actually says.
      key={filters.q}
      action={pathname}
      method="get"
      role="search"
      className="mt-6 space-y-2"
    >
      <Label htmlFor="photo-search" className="text-xs text-muted-foreground">
        Search alt text
      </Label>
      <div className="flex gap-2">
        <Input
          id="photo-search"
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="e.g. courtyard"
          autoComplete="off"
          className="h-8"
        />
        <Button type="submit" size="icon" variant="outline" className="size-8">
          <SearchIcon aria-hidden="true" />
          <span className="sr-only">Search</span>
        </Button>
      </div>
      {filters.tag ? (
        <input type="hidden" name="tag" value={filters.tag} />
      ) : null}
    </form>
  )
}
