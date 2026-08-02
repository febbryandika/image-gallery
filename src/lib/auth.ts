import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/db'

export const auth = betterAuth({
  // BETTER_AUTH_SECRET and BETTER_AUTH_URL are read from the environment.
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  // Lets Server Actions set the session cookie. Must stay last in the array.
  plugins: [nextCookies()],
})

export type Session = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>

export async function getSession(): Promise<Session | null> {
  return auth.api.getSession({ headers: await headers() })
}

/**
 * The only way server code learns who is asking. The redirect is UX — every
 * query still filters by the returned user id (SPEC §6, §7).
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}
