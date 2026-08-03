import Link from 'next/link'
import { signOutAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { getSession } from '@/lib/auth'

export async function SiteHeader() {
  const session = await getSession()

  return (
    <header className="border-b">
      <a
        href="#content"
        className="sr-only rounded-md bg-background px-4 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:ring-2 focus:ring-ring focus:outline-none"
      >
        Skip to content
      </a>
      <nav
        aria-label="Main"
        className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4"
      >
        <Link href="/" className="rounded-sm font-semibold tracking-tight">
          Image Gallery
        </Link>
        {session ? (
          <div className="flex items-center gap-4">
            <Link href="/upload" className="rounded-sm text-sm">
              Upload
            </Link>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {session.user.email}
            </span>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        ) : null}
      </nav>
    </header>
  )
}
