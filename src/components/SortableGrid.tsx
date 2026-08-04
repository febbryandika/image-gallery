'use client'

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type ScreenReaderInstructions,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { reorderAlbum } from '@/app/actions/photos'
import { Lightbox } from '@/components/Lightbox'
import { SortablePhotoCard } from '@/components/SortablePhotoCard'
import { useLightbox } from '@/components/use-lightbox'
import type { AlbumOption, PhotoView } from '@/lib/photo-view'

type SortableGridProps = {
  albumId: string
  photos: PhotoView[]
  albums: AlbumOption[]
  /** False while a filter hides part of the album — see the album page. */
  reorderable: boolean
}

const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    'Press Space to pick up this photo. Use the arrow keys to move it, Space again to drop it, and Escape to cancel.',
}

/**
 * A refusal the action explained, as opposed to the network falling over.
 * Only the former carries a message worth showing the user.
 */
class ReorderRejected extends Error {}

function describe(photo: PhotoView | undefined): string {
  if (!photo) return 'the photo'
  return photo.altText.trim() === '' ? 'the photo' : photo.altText
}

export function SortableGrid({
  albumId,
  photos,
  albums,
  reorderable,
}: SortableGridProps) {
  const router = useRouter()
  const [order, setOrder] = useState(photos)
  // Adjusting state when props change: a revalidation has to win over the
  // order this component is holding, or the grid would ignore the server.
  const [serverOrder, setServerOrder] = useState(photos)
  if (photos !== serverOrder) {
    setServerOrder(photos)
    setOrder(photos)
  }

  const { openIndex, onOpen, ...lightbox } = useLightbox(order)

  const reorder = useMutation({
    mutationFn: async (next: PhotoView[]) => {
      const result = await reorderAlbum(
        albumId,
        next.map((photo) => photo.id),
      )
      // The actions in this codebase return a result object rather than
      // throwing; TanStack Query needs a rejection to reach onError.
      if (!result.ok) throw new ReorderRejected(result.error)
    },
    onMutate: (next) => {
      // Snapshot first, then show the new order. The snapshot is this render's
      // `order` — what the server last confirmed.
      const rollback = order
      setOrder(next)
      return { rollback }
    },
    onError: (error, _next, context) => {
      // Never leave an order on screen that the server did not accept.
      if (context) setOrder(context.rollback)
      // A dropped connection produces "Failed to fetch", which means nothing to
      // the person looking at the grid — only show what the action actually said.
      toast.error(
        error instanceof ReorderRejected
          ? error.message
          : 'Could not save that order. Try again.',
      )
    },
    onSuccess: () => router.refresh(),
  })

  const sensors = useSensors(
    // A small threshold, so a plain click still opens the lightbox.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      const index = order.findIndex((photo) => photo.id === active.id)
      return `Picked up ${describe(order[index])}. Position ${index + 1} of ${order.length}.`
    },
    onDragOver: ({ active, over }) => {
      if (!over) return
      const index = order.findIndex((photo) => photo.id === over.id)
      const moving = order.find((photo) => photo.id === active.id)
      return `${describe(moving)} moved to position ${index + 1} of ${order.length}.`
    },
    onDragEnd: ({ active, over }) => {
      if (!over)
        return `${describe(order.find((p) => p.id === active.id))} was dropped.`
      const index = order.findIndex((photo) => photo.id === over.id)
      const moving = order.find((photo) => photo.id === active.id)
      return `${describe(moving)} dropped at position ${index + 1} of ${order.length}.`
    },
    onDragCancel: ({ active }) =>
      `Reordering cancelled. ${describe(order.find((p) => p.id === active.id))} returned to its original position.`,
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const from = order.findIndex((photo) => photo.id === active.id)
    const to = order.findIndex((photo) => photo.id === over.id)
    if (from === -1 || to === -1) return

    // onMutate applies this optimistically and keeps the rollback snapshot.
    reorder.mutate(arrayMove(order, from, to))
  }

  return (
    <>
      {reorderable ? null : (
        <p className="text-sm text-muted-foreground">
          Clear the filter to rearrange this album.
        </p>
      )}

      <DndContext
        // Explicit, because dnd-kit otherwise derives the `aria-describedby`
        // it puts on every handle from a module-level counter that restarts on
        // the server — the client picks a different number and hydration
        // mismatches. There is only ever one of these per page.
        id="album-reorder"
        sensors={sensors}
        collisionDetection={closestCenter}
        accessibility={{ announcements, screenReaderInstructions }}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={order.map((photo) => photo.id)}
          strategy={rectSortingStrategy}
        >
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {order.map((photo) => (
              <SortablePhotoCard
                key={photo.id}
                photo={photo}
                albums={albums}
                // One drop at a time, so a second can't race the first.
                disabled={!reorderable || reorder.isPending}
                onOpen={onOpen}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <Lightbox
        photos={order}
        albums={albums}
        index={openIndex}
        {...lightbox}
      />
    </>
  )
}
