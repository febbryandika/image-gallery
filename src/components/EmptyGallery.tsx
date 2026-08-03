import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function EmptyGallery() {
  return (
    <div className="rounded-lg border border-dashed px-6 py-16 text-center">
      <h2 className="text-lg font-medium">No photos yet</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Upload a photo and it will appear here with alt text and tags ready to
        edit.
      </p>
      <Button asChild className="mt-6">
        <Link href="/upload">Upload your first photo</Link>
      </Button>
    </div>
  )
}
