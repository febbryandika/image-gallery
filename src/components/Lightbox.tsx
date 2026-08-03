'use client'

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { PhotoView } from '@/lib/photo-view'

type LightboxProps = {
  photos: PhotoView[]
  index: number | null
  onIndexChange: (index: number) => void
  onClose: () => void
  onCloseAutoFocus: (event: Event) => void
}

export function Lightbox({
  photos,
  index,
  onIndexChange,
  onClose,
  onCloseAutoFocus,
}: LightboxProps) {
  if (index === null) return null

  const photo = photos[index]
  if (!photo) return null

  const hasPrevious = index > 0
  const hasNext = index < photos.length - 1
  const current = index

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

  const title = photo.altText.trim() === '' ? 'Photo' : photo.altText

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        onCloseAutoFocus={onCloseAutoFocus}
        onKeyDown={handleKeyDown}
        className="max-w-[95vw] motion-reduce:transition-none motion-reduce:data-[state=closed]:animate-none motion-reduce:data-[state=open]:animate-none sm:max-w-3xl"
      >
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

        <div
          className="flex items-center justify-between gap-4"
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
      </DialogContent>
    </Dialog>
  )
}
