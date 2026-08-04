/**
 * Filter state lives in the URL and nowhere else, so a filtered view is a link
 * you can paste and reload (SPEC §5). This module owns the shape of that query
 * string — both routes and the sidebar go through it rather than hand-rolling
 * `?tag=…` strings.
 */

/** What the App Router hands a page for `searchParams`. */
export type RawSearchParams = Record<string, string | string[] | undefined>

export type PhotoFilters = {
  tag: string | null
  q: string
  page: number
}

/** Repeated params (`?tag=a&tag=b`) arrive as arrays; take the first. */
function first(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === 'string' ? value : ''
}

/** searchParams are attacker-controlled: coerce, never trust. */
export function parseFilters(raw: RawSearchParams): PhotoFilters {
  const page = Number(first(raw.page))
  const tag = first(raw.tag).trim().toLowerCase()

  return {
    // Tags are stored normalised (SPEC §7), so match how they were written.
    tag: tag === '' ? null : tag,
    q: first(raw.q).trim(),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }
}

export function hasActiveFilter(filters: PhotoFilters): boolean {
  return filters.tag !== null || filters.q !== ''
}

/**
 * Rebuilds the query string with some fields changed. Any change to `tag` or
 * `q` resets the page — page 4 of the old result set means nothing in the new
 * one, and would strand the user on an empty grid.
 */
export function filterHref(
  pathname: string,
  current: PhotoFilters,
  patch: Partial<PhotoFilters> = {},
): string {
  const next = { ...current, ...patch }
  const changedFilter =
    (patch.tag !== undefined && patch.tag !== current.tag) ||
    (patch.q !== undefined && patch.q !== current.q)

  const params = new URLSearchParams()
  if (next.tag) params.set('tag', next.tag)
  if (next.q) params.set('q', next.q)

  const page = changedFilter && patch.page === undefined ? 1 : next.page
  if (page > 1) params.set('page', String(page))

  const query = params.toString()
  return query === '' ? pathname : `${pathname}?${query}`
}
