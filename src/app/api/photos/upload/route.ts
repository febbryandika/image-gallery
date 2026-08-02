// Sharp needs the Node runtime; the default edge runtime won't do (SPEC §4.1).
export const runtime = 'nodejs'

// Phase 4 replaces this with validate → Sharp → R2 → DB insert (SPEC §4.1).
export function POST(): Response {
  return Response.json({ error: 'Not implemented' }, { status: 501 })
}
