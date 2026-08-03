'use client'

import { useRef, useState } from 'react'
import { Lightbox } from '@/components/Lightbox'
import { PhotoCard } from '@/components/PhotoCard'
import type { PhotoView } from '@/lib/photo-view'

type PhotoGridProps = {
  photos: PhotoView[]
}

export function PhotoGrid({ photos }: PhotoGridProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  // The card that opened the lightbox, so focus can return to it on close.
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  function handleOpen(id: string, trigger: HTMLButtonElement) {
    const index = photos.findIndex((photo) => photo.id === id)
    if (index === -1) return

    triggerRef.current = trigger
    setOpenIndex(index)
  }

  function handleClose() {
    setOpenIndex(null)
  }

  function handleCloseAutoFocus(event: Event) {
    // Radix would focus the Dialog's own trigger; there isn't one, so put focus
    // back on the card that opened it (SPEC §5.2).
    event.preventDefault()
    triggerRef.current?.focus()
  }

  return (
    <>
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
        {photos.map((photo) => (
          <PhotoCard key={photo.id} photo={photo} onOpen={handleOpen} />
        ))}
      </div>

      <Lightbox
        photos={photos}
        index={openIndex}
        onIndexChange={setOpenIndex}
        onClose={handleClose}
        onCloseAutoFocus={handleCloseAutoFocus}
      />
    </>
  )
}
