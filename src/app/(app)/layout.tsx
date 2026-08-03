import { AlbumSidebar } from '@/components/AlbumSidebar'
import { requireSession } from '@/lib/auth'

// The redirect is UX only — every query and mutation still filters by the
// session user id.
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await requireSession()

  return (
    <div className="flex flex-col gap-8 md:flex-row">
      <AlbumSidebar userId={session.user.id} />
      {/* min-w-0 so the masonry columns shrink instead of overflowing. */}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
