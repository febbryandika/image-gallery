'use client'

import { Trash2Icon } from 'lucide-react'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { deletePhoto } from '@/app/actions/photos'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

type DeletePhotoButtonProps = {
  photoId: string
  altText: string
}

export function DeletePhotoButton({
  photoId,
  altText,
}: DeletePhotoButtonProps) {
  const [pending, startTransition] = useTransition()

  // Names the photo rather than saying "this item" (SPEC §5.1).
  const label = altText.trim() === '' ? 'this photo' : `“${altText}”`

  function handleConfirm() {
    startTransition(async () => {
      try {
        await deletePhoto(photoId)
      } catch {
        toast.error('Could not delete that photo. Try again.')
      }
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          disabled={pending}
          aria-label={`Delete ${label}`}
        >
          <Trash2Icon aria-hidden="true" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {label}?</AlertDialogTitle>
          <AlertDialogDescription>
            The photo and its thumbnail are removed permanently. This can&apos;t
            be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
