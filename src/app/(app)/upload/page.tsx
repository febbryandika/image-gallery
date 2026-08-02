import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Upload' }

// Phase 4 replaces this with the UploadForm (SPEC §5).
export default function UploadPage() {
  return <h1 className="text-2xl font-semibold tracking-tight">Upload</h1>
}
