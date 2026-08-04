'use client'

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { MovePhotoMenu } from '@/components/MovePhotoMenu'
import { Button } from '@/components/ui/button'
import type { AlbumOption, PhotoView } from '@/lib/photo-view'

type LightboxProps = {
  photos: PhotoView[]
  albums: AlbumOption[]
  index: number | null
  onIndexChange: (index: number) => void
  onClose: () => void
  onCloseAutoFocus: (event: Event) => void
}

export function Lightbox({
  photos,
  albums,
  index,
  onIndexChange,
  onClose,
  onCloseAutoFocus,
}: LightboxProps) {
  /**
   * Deliberately not an early `return null`. Unmounting the Dialog the instant
   * it closes robs Radix of its close sequence, so `onCloseAutoFocus` never
   * runs and focus is dropped on the body instead of returning to the card
   * that opened it (SPEC §5.2). Staying mounted with `open={false}` is what
   * makes the focus return actually happen.
   */
  const photo = index === null ? undefined : photos[index]

  const current = index ?? 0
  const hasPrevious = current > 0
  const hasNext = current < photos.length - 1

  function handleOpenChange(open: boolean) {
    if (!open) onClose()
  }

  function handlePrevious() {
    if (hasPrevious) onIndexChange(current - 1)
  }

  function handleNext() {
    if (hasNext) onIndexChange(current + 1)
  }

  // Esc is Radix's; the arrows are ours (SPEC §5.2).
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      handlePrevious()
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      handleNext()
    }
  }

  const title =
    photo === undefined || photo.altText.trim() === '' ? 'Photo' : photo.altText

  return (
    <Dialog open={photo !== undefined} onOpenChange={handleOpenChange}>
      <DialogContent
        onCloseAutoFocus={onCloseAutoFocus}
        onKeyDown={handleKeyDown}
        // Reduced motion is handled by DialogContent itself now, so every
        // dialog in the app respects it rather than just this one.
        className="max-w-[95vw] sm:max-w-3xl"
      >
        {photo === undefined ? null : (
          <>
            <DialogTitle className="text-base">{title}</DialogTitle>
            <DialogDescription
              className={photo.description ? undefined : 'sr-only'}
            >
              {photo.description || 'No description yet.'}
            </DialogDescription>

            <Image
              src={photo.fullUrl}
              width={photo.width}
              height={photo.height}
              alt={photo.altText}
              sizes="(min-width: 640px) 768px, 95vw"
              className="h-auto max-h-[70vh] w-full rounded-md bg-muted object-contain"
              priority
            />

            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Outside the navigation group — it moves the photo, it doesn't
              navigate between photos. */}
              <MovePhotoMenu photo={photo} albums={albums} />

              <div
                className="flex flex-1 items-center justify-between gap-4"
                role="group"
                aria-label="Photo navigation"
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={!hasPrevious}
                >
                  <ChevronLeftIcon aria-hidden="true" />
                  Previous
                </Button>
                <p aria-live="polite" className="text-sm text-muted-foreground">
                  {current + 1} of {photos.length}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={!hasNext}
                >
                  Next
                  <ChevronRightIcon aria-hidden="true" />
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
