import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sign in' }

// Phase 2 replaces this with the Better Auth email + password form (SPEC §6).
export default function LoginPage() {
  return <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
}
