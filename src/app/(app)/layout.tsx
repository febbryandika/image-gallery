import { requireSession } from '@/lib/auth'

// UX only — every query and mutation still filters by the session user id.
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  await requireSession()

  return children
}
