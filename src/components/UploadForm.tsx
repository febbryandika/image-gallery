'use client'

import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updatePhoto } from '@/app/actions/photos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  ALLOWED_UPLOAD_TYPES,
  MAX_TAGS_PER_PHOTO,
  MAX_UPLOAD_BYTES,
} from '@/lib/validation'

const MAX_MB = MAX_UPLOAD_BYTES / 1024 / 1024

type UploadedPhoto = {
  id: string
  altText: string
  description: string
  tags: string[]
}

type Row =
  | { key: string; name: string; status: 'uploading' }
  | { key: string; name: string; status: 'rejected'; error: string }
  | { key: string; name: string; status: 'failed'; error: string }
  | { key: string; name: string; status: 'done'; photo: UploadedPhoto }

let rowCounter = 0

/** Convenience only — the server checks both of these again. */
function rejectionReason(file: File): string | null {
  const allowed: readonly string[] = ALLOWED_UPLOAD_TYPES
  if (!allowed.includes(file.type)) return 'Must be a JPEG, PNG or WebP.'
  if (file.size > MAX_UPLOAD_BYTES) return `Must be under ${MAX_MB}MB.`
  return null
}

export function UploadForm() {
  const [rows, setRows] = useState<Row[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  function replaceRow(key: string, next: Row) {
    setRows((current) => current.map((row) => (row.key === key ? next : row)))
  }

  async function uploadOne(file: File, key: string) {
    const body = new FormData()
    body.set('file', file)

    try {
      const response = await fetch('/api/photos/upload', {
        method: 'POST',
        body,
      })
      const payload: unknown = await response.json()

      if (!response.ok) {
        const message =
          typeof payload === 'object' &&
          payload !== null &&
          'error' in payload &&
          typeof payload.error === 'string'
            ? payload.error
            : 'Upload failed.'
        replaceRow(key, {
          key,
          name: file.name,
          status: 'failed',
          error: message,
        })
        return
      }

      const photo = payload as UploadedPhoto
      replaceRow(key, { key, name: file.name, status: 'done', photo })
    } catch {
      replaceRow(key, {
        key,
        name: file.name,
        status: 'failed',
        error: 'Upload failed. Check your connection and try again.',
      })
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const files = [...(inputRef.current?.files ?? [])]
    if (files.length === 0) return

    const started: Row[] = files.map((file) => {
      const key = `row-${(rowCounter += 1)}`
      const error = rejectionReason(file)
      return error
        ? { key, name: file.name, status: 'rejected', error }
        : { key, name: file.name, status: 'uploading' }
    })

    // Newest first, so a fresh upload isn't pushed below earlier rows.
    setRows((current) => [...started, ...current])

    // The form stays usable while these run (SPEC §5.1).
    started.forEach((row, index) => {
      const file = files[index]
      if (row.status === 'uploading' && file) void uploadOne(file, row.key)
    })

    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file">Photos</Label>
          <Input
            ref={inputRef}
            id="file"
            name="file"
            type="file"
            multiple
            accept={ALLOWED_UPLOAD_TYPES.join(',')}
            required
            aria-describedby="file-hint"
          />
          <p id="file-hint" className="text-sm text-muted-foreground">
            JPEG, PNG or WebP, under {MAX_MB}MB each. Alt text and tags are
            written for you.
          </p>
        </div>
        <Button type="submit">Upload</Button>
      </form>

      {rows.length > 0 ? (
        <ul className="space-y-4">
          {rows.map((row) => (
            <li key={row.key} className="rounded-lg border p-4">
              <PhotoRow row={row} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function PhotoRow({ row }: { row: Row }) {
  if (row.status === 'uploading') {
    return (
      <p className="text-sm">
        <span className="font-medium">{row.name}</span>{' '}
        <span role="status" className="text-muted-foreground">
          Uploading and describing…
        </span>
      </p>
    )
  }

  if (row.status === 'rejected' || row.status === 'failed') {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium">{row.name}</p>
        {/* Inline on the row, naming the real limit — never a generic toast. */}
        <p role="alert" className="text-sm text-destructive">
          {row.error}
        </p>
      </div>
    )
  }

  return <MetadataForm name={row.name} photo={row.photo} />
}

function MetadataForm({ name, photo }: { name: string; photo: UploadedPhoto }) {
  const [altText, setAltText] = useState(photo.altText)
  const [description, setDescription] = useState(photo.description)
  const [tags, setTags] = useState(photo.tags.join(', '))
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  // The vision call returned nothing usable — say so rather than silently
  // showing empty fields (SPEC §5.1).
  const visionFailed = photo.altText.trim() === '' && photo.tags.length === 0

  const altId = `alt-${photo.id}`
  const descId = `desc-${photo.id}`
  const tagsId = `tags-${photo.id}`

  function handleSave() {
    startTransition(async () => {
      const result = await updatePhoto(photo.id, {
        altText,
        description,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      })

      if (result.ok) {
        setSaved(true)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">{name}</p>

      {visionFailed ? (
        <p role="alert" className="text-sm text-muted-foreground">
          Couldn&apos;t generate a description — add one below.
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor={altId}>Alt text</Label>
        <Input
          id={altId}
          value={altText}
          maxLength={125}
          onChange={(event) => setAltText(event.target.value)}
          aria-describedby={`${altId}-hint`}
        />
        <p id={`${altId}-hint`} className="text-sm text-muted-foreground">
          What a screen reader announces. Under 125 characters.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={descId}>Description</Label>
        <Textarea
          id={descId}
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={tagsId}>Tags</Label>
        <Input
          id={tagsId}
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          aria-describedby={`${tagsId}-hint`}
        />
        <p id={`${tagsId}-hint`} className="text-sm text-muted-foreground">
          Comma separated, up to {MAX_TAGS_PER_PHOTO}.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleSave} disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
        {saved ? (
          <span role="status" className="text-sm text-muted-foreground">
            Saved
          </span>
        ) : null}
      </div>
    </div>
  )
}
