import type { Metadata } from 'next'
import { UploadForm } from '@/components/UploadForm'

export const metadata: Metadata = { title: 'Upload' }

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Upload</h1>
      <UploadForm />
    </div>
  )
}
