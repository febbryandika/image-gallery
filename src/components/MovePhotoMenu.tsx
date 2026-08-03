'use client'

import { FolderIcon } from 'lucide-react'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { updatePhoto } from '@/app/actions/photos'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { AlbumOption, PhotoView } from '@/lib/photo-view'

/** Radio values are strings; this stands in for "no album" (a null albumId). */
const NO_ALBUM = ''

type MovePhotoMenuProps = {
  photo: PhotoView
  albums: AlbumOption[]
}

export function MovePhotoMenu({ photo, albums }: MovePhotoMenuProps) {
  const [pending, startTransition] = useTransition()

  const label =
    photo.altText.trim() === '' ? 'this photo' : `“${photo.altText}”`

  function handleValueChange(value: string) {
    const albumId = value === NO_ALBUM ? null : value
    if (albumId === photo.albumId) return

    startTransition(async () => {
      // updatePhoto owns the whole metadata record, so the fields this menu
      // isn't editing are sent back as they are. normalizeTags re-running on
      // already-normalized tags is a no-op.
      const result = await updatePhoto(photo.id, {
        altText: photo.altText,
        description: photo.description,
        tags: photo.tags,
        albumId,
      })

      if (!result.ok) toast.error(result.error)
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          disabled={pending}
          aria-label={`Move ${label} to an album`}
        >
          <FolderIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Album</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={photo.albumId ?? NO_ALBUM}
          onValueChange={handleValueChange}
        >
          <DropdownMenuRadioItem value={NO_ALBUM}>
            No album
          </DropdownMenuRadioItem>
          {albums.map((album) => (
            <DropdownMenuRadioItem key={album.id} value={album.id}>
              {album.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
