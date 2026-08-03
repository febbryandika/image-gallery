import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { nextCookies } from 'better-auth/next-js'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/db'

export const auth = betterAuth({
  // BETTER_AUTH_SECRET and BETTER_AUTH_URL are read from the environment.
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  hooks: {
    /**
     * The real registration gate on the public demo (SPEC §7). Hiding the
     * button and the check in the Server Action are UX; without this the
     * endpoint is reachable directly. Deliberately not `disableSignUp`,
     * which answers 400 — a refusal to serve is a 403.
     */
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === '/sign-up/email' && process.env.DEMO_MODE === 'true') {
        throw new APIError('FORBIDDEN', {
          message: 'Registration is disabled on the demo instance.',
        })
      }
    }),
  },
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
