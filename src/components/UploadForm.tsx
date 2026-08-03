'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from '@/lib/validation'

const MAX_MB = MAX_UPLOAD_BYTES / 1024 / 1024

// Phase 4 shape: prove the pipeline. Per-file progress rows and the editable
// AI metadata fields arrive in Phase 7 (SPEC §5).
export function UploadForm() {
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    const data = new FormData(form)
    const file = data.get('file')

    setError(null)
    setResult(null)

    if (!(file instanceof File) || file.size === 0) {
      setError('Choose a file first.')
      return
    }

    // Convenience only — the server checks both of these again.
    const allowed: readonly string[] = ALLOWED_UPLOAD_TYPES
    if (!allowed.includes(file.type)) {
      setError('Must be a JPEG, PNG or WebP.')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`Must be under ${MAX_MB}MB.`)
      return
    }

    setPending(true)
    try {
      const response = await fetch('/api/photos/upload', {
        method: 'POST',
        body: data,
      })
      const body: unknown = await response.json()

      setResult(JSON.stringify({ status: response.status, body }, null, 2))
      if (response.ok) form.reset()
    } catch (cause) {
      setError(`Upload failed: ${String(cause)}`)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file">Photo</Label>
          <Input
            id="file"
            name="file"
            type="file"
            accept={ALLOWED_UPLOAD_TYPES.join(',')}
            required
            aria-describedby="file-hint"
          />
          <p id="file-hint" className="text-sm text-muted-foreground">
            JPEG, PNG or WebP, under {MAX_MB}MB.
          </p>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/50 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending ? 'Uploading…' : 'Upload'}
        </Button>
      </form>

      {result ? (
        <div className="space-y-2">
          <h2 className="text-sm font-medium">Response</h2>
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
            {result}
          </pre>
        </div>
      ) : null}
    </div>
  )
}
