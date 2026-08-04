'use client'

import { CheckIcon, MoreHorizontalIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { deleteAlbum, renameAlbum } from '@/app/actions/albums'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { MAX_ALBUM_NAME_LENGTH } from '@/lib/validation'

type AlbumRowProps = {
  href: string
  name: string
  photoCount: number
  /**
   * Absent on the "All photos" row, which is a destination but not a record —
   * it can't be renamed or deleted.
   */
  albumId?: string
}

export function AlbumRow({ href, name, photoCount, albumId }: AlbumRowProps) {
  const pathname = usePathname()
  const [renaming, setRenaming] = useState(false)
  const [pending, startTransition] = useTransition()

  // The layout can't read a child route's params, so the row resolves its own
  // active state from the URL.
  const isActive = pathname === href

  function handleRenameSelect() {
    setRenaming(true)
  }

  function handleMenuCloseAutoFocus(event: Event) {
    // Renaming swaps the link for an input; let that input keep the focus its
    // autoFocus took, instead of Radix pulling focus back to the ⋯ trigger.
    if (renaming) event.preventDefault()
  }

  function handleRenameSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!albumId) return

    const next = new FormData(event.currentTarget).get('name')
    if (typeof next !== 'string') return

    startTransition(async () => {
      const result = await renameAlbum(albumId, next)

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      setRenaming(false)
    })
  }

  function handleRenameKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') setRenaming(false)
  }

  function handleRenameBlur(event: React.FocusEvent<HTMLInputElement>) {
    // Moving to the form's own Save button is not leaving the field — cancelling
    // there would unmount the button before its click ever landed.
    const next = event.relatedTarget
    if (next instanceof Node && event.currentTarget.form?.contains(next)) return

    setRenaming(false)
  }

  function handleDeleteConfirm() {
    if (!albumId) return

    startTransition(async () => {
      const result = await deleteAlbum(albumId)
      if (!result.ok) toast.error(result.error)
    })
  }

  if (renaming && albumId) {
    return (
      <li>
        <form onSubmit={handleRenameSubmit} className="px-1 py-0.5">
          <label htmlFor={`rename-${albumId}`} className="sr-only">
            Rename {name}
          </label>
          <div className="flex gap-1">
            <Input
              id={`rename-${albumId}`}
              name="name"
              defaultValue={name}
              maxLength={MAX_ALBUM_NAME_LENGTH}
              autoComplete="off"
              disabled={pending}
              onKeyDown={handleRenameKeyDown}
              onBlur={handleRenameBlur}
              className="h-8"
              // The row was just swapped for this input by an explicit "Rename"
              // action, so focus belongs here.
              autoFocus
            />
            {/* A real submit control, rather than leaning on the browser's
                implicit submission of a single-field form. */}
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              disabled={pending}
              aria-label={`Save name for ${name}`}
              className="size-8 shrink-0"
            >
              <CheckIcon aria-hidden="true" />
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Enter to save, Escape to cancel
          </p>
        </form>
      </li>
    )
  }

  return (
    <li className="group flex items-center gap-1">
      <Link
        href={href}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'flex min-w-0 flex-1 items-baseline justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          isActive && 'bg-accent font-medium',
        )}
      >
        <span className="truncate">{name}</span>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {photoCount}
          <span className="sr-only">
            {photoCount === 1 ? ' photo' : ' photos'}
          </span>
        </span>
      </Link>

      {albumId ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={pending}
              aria-label={`Actions for ${name}`}
              // Always reachable by keyboard; only visually quiet until hover.
              // Plain `group`, not a named one: the named-group variants
              // generated no CSS at all, so hovering the row never revealed
              // this button for mouse users.
              className="size-7 shrink-0 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100"
            >
              <MoreHorizontalIcon aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onCloseAutoFocus={handleMenuCloseAutoFocus}
          >
            <DropdownMenuItem onSelect={handleRenameSelect}>
              Rename
            </DropdownMenuItem>
            <DeleteAlbumItem
              name={name}
              photoCount={photoCount}
              onConfirm={handleDeleteConfirm}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </li>
  )
}

type DeleteAlbumItemProps = {
  name: string
  photoCount: number
  onConfirm: () => void
}

/**
 * The confirm dialog is state-controlled rather than wrapped around the menu
 * item: the menu unmounts its items on close, which would take the trigger —
 * and the dialog with it — along with it.
 */
function DeleteAlbumItem({
  name,
  photoCount,
  onConfirm,
}: DeleteAlbumItemProps) {
  const [open, setOpen] = useState(false)

  function handleSelect(event: Event) {
    event.preventDefault()
    setOpen(true)
  }

  const photoLine =
    photoCount === 0
      ? 'It has no photos in it.'
      : `Its ${photoCount} ${photoCount === 1 ? 'photo is' : 'photos are'} not deleted — ${photoCount === 1 ? 'it moves' : 'they move'} back to All photos.`

  return (
    <>
      <DropdownMenuItem variant="destructive" onSelect={handleSelect}>
        Delete
      </DropdownMenuItem>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete the album “{name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The album is removed. {photoLine}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>
              Delete album
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
