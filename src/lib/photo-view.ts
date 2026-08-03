/**
 * What a Client Component is allowed to know about a photo. The page derives
 * URLs server-side with publicUrl(), so `@/lib/r2` — and the S3 SDK it pulls
 * in — never crosses the client boundary.
 */
export type PhotoView = {
  id: string
  thumbUrl: string
  fullUrl: string
  altText: string
  description: string
  tags: string[]
  width: number
  height: number
  albumId: string | null
}

/** The album list a move menu picks from. Names only — no counts, no photos. */
export type AlbumOption = {
  id: string
  name: string
}
