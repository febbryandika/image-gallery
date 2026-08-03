import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function EmptyAlbum() {
  return (
    <div className="rounded-lg border border-dashed px-6 py-16 text-center">
      <h2 className="text-lg font-medium">Nothing in this album yet</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Move a photo in from the gallery using the folder button on its card.
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/">Back to all photos</Link>
      </Button>
    </div>
  )
}
