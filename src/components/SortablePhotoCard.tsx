'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVerticalIcon } from 'lucide-react'
import { PhotoCard } from '@/components/PhotoCard'
import { usePrefersReducedMotion } from '@/components/use-prefers-reduced-motion'
import { cn } from '@/lib/utils'
import type { AlbumOption, PhotoView } from '@/lib/photo-view'

type SortablePhotoCardProps = {
  photo: PhotoView
  albums: AlbumOption[]
  disabled: boolean
  onOpen: (id: string, trigger: HTMLButtonElement) => void
}

export function SortablePhotoCard({
  photo,
  albums,
  disabled,
  onOpen,
}: SortablePhotoCardProps) {
  const reducedMotion = usePrefersReducedMotion()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id, disabled })

  const label = photo.altText.trim() === '' ? 'this photo' : photo.altText

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        // dnd-kit writes this inline, so a `motion-reduce:` class can't reach
        // it — drop the value instead (SPEC §5.2).
        transition: reducedMotion ? undefined : transition,
      }}
      className={cn('group relative', isDragging && 'z-10 opacity-60')}
    >
      <PhotoCard photo={photo} albums={albums} onOpen={onOpen} variant="grid" />

      {/*
        A handle of its own, not the card body. The card's main element is
        already a button that opens the lightbox, and dnd-kit's keyboard sensor
        picks up on Space — one control cannot mean both.
      */}
      <button
        type="button"
        disabled={disabled}
        aria-label={`Reorder ${label}`}
        className="absolute bottom-2 left-2 inline-flex size-8 cursor-grab touch-none items-center justify-center rounded-md bg-secondary text-secondary-foreground opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing disabled:cursor-default motion-reduce:transition-none"
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon aria-hidden="true" className="size-4" />
      </button>
    </li>
  )
}
