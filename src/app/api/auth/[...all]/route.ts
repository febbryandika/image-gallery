// Phase 2 replaces this with the Better Auth handler (SPEC §2, §6).
function notImplemented(): Response {
  return Response.json({ error: 'Not implemented' }, { status: 501 })
}

export const GET = notImplemented
export const POST = notImplemented
