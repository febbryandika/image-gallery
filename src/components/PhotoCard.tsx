'use client'

import Image from 'next/image'
import { DeletePhotoButton } from '@/components/DeletePhotoButton'
import { Badge } from '@/components/ui/badge'
import type { PhotoView } from '@/lib/photo-view'

type PhotoCardProps = {
  photo: PhotoView
  onOpen: (id: string, trigger: HTMLButtonElement) => void
}

export function PhotoCard({ photo, onOpen }: PhotoCardProps) {
  const needsAltText = photo.altText.trim() === ''

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    onOpen(photo.id, event.currentTarget)
  }

  return (
    <div className="group relative mb-4 break-inside-avoid">
      <button
        type="button"
        onClick={handleClick}
        aria-label={
          needsAltText
            ? 'Open photo — no alt text yet'
            : `Open photo: ${photo.altText}`
        }
        className="block w-full overflow-hidden rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <Image
          // width/height come from the row, so the box is reserved before the
          // bytes arrive. The thumbnail shares the full image's aspect ratio.
          src={photo.thumbUrl}
          width={photo.width}
          height={photo.height}
          alt={photo.altText}
          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="h-auto w-full bg-muted"
        />
      </button>

      {needsAltText ? (
        <Badge variant="secondary" className="absolute top-2 left-2">
          Add alt text
        </Badge>
      ) : null}

      <div className="absolute top-2 right-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none">
        <DeletePhotoButton photoId={photo.id} altText={photo.altText} />
      </div>

      {photo.tags.length > 0 ? (
        // Shown on focus-within too, or they'd be invisible to a keyboard user.
        <ul className="pointer-events-none absolute inset-x-2 bottom-2 flex flex-wrap gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none">
          {photo.tags.map((tag) => (
            <li key={tag}>
              <Badge variant="secondary">{tag}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
