// Phase 8 replaces this with the album grid and Phase 9 adds drag-to-reorder (SPEC §5).
export default async function AlbumPage({
  params,
}: PageProps<'/albums/[albumId]'>) {
  const { albumId } = await params

  return (
    <h1 className="text-2xl font-semibold tracking-tight">Album {albumId}</h1>
  )
}
