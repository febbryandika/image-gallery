'use client'

import { useRef, useState } from 'react'
import type { PhotoView } from '@/lib/photo-view'

/**
 * The lightbox wiring both grids need: which photo is open, and returning focus
 * to the card that opened it on close (SPEC §5.2).
 */
export function useLightbox(photos: PhotoView[]) {
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
    // back on the card that opened it.
    event.preventDefault()
    triggerRef.current?.focus()
  }

  return {
    openIndex,
    onIndexChange: setOpenIndex,
    onOpen: handleOpen,
    onClose: handleClose,
    onCloseAutoFocus: handleCloseAutoFocus,
  }
}
