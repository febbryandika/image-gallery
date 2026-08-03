'use client'

import { Lightbox } from '@/components/Lightbox'
import { PhotoCard } from '@/components/PhotoCard'
import { useLightbox } from '@/components/use-lightbox'
import type { AlbumOption, PhotoView } from '@/lib/photo-view'

type PhotoGridProps = {
  photos: PhotoView[]
  albums: AlbumOption[]
}

export function PhotoGrid({ photos, albums }: PhotoGridProps) {
  const { openIndex, onOpen, ...lightbox } = useLightbox(photos)

  return (
    <>
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
        {photos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            albums={albums}
            onOpen={onOpen}
          />
        ))}
      </div>

      <Lightbox
        photos={photos}
        albums={albums}
        index={openIndex}
        {...lightbox}
      />
    </>
  )
}
