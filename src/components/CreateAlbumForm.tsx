'use client'

import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { createAlbum } from '@/app/actions/albums'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MAX_ALBUM_NAME_LENGTH } from '@/lib/validation'

export function CreateAlbumForm() {
  const [name, setName] = useState('')
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setName(event.target.value)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      const result = await createAlbum(name)

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      setName('')
      // Keeps focus in the field so several albums can be added in a row.
      inputRef.current?.focus()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-2">
      <Label htmlFor="new-album-name" className="text-xs text-muted-foreground">
        New album
      </Label>
      <div className="flex gap-2">
        <Input
          id="new-album-name"
          ref={inputRef}
          value={name}
          onChange={handleChange}
          maxLength={MAX_ALBUM_NAME_LENGTH}
          placeholder="Album name"
          autoComplete="off"
          className="h-8"
        />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={pending || name.trim() === ''}
        >
          Add
        </Button>
      </div>
    </form>
  )
}
