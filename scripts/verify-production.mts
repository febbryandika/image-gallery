/**
 * Checks the two production-only behaviours SPEC §7 promises, against a
 * deployed instance:
 *
 *   pnpm verify:production https://your-app.vercel.app
 *
 * Read-only: it registers nothing and uploads nothing. It asserts that the
 * demo instance *refuses* to register, and that the upload route refuses an
 * unauthenticated caller — the same guard the 50-photo cap sits behind.
 */

const base = process.argv[2]?.replace(/\/+$/, '')

if (!base) {
  console.error('Usage: pnpm verify:production <deployment-url>')
  process.exit(1)
}

type Check = { name: string; ok: boolean; detail: string }
const checks: Check[] = []

function record(name: string, ok: boolean, detail: string): void {
  checks.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`)
}

// 1. DEMO_MODE=true must refuse registration at the endpoint, not just hide the
//    button. A 403 is the refusal; a 400 would mean disableSignUp, and a 200
//    means DEMO_MODE is not set on the deployment.
//
//    The Origin header matters: without it Better Auth's CSRF guard answers 403
//    on its own, which looks identical to the refusal we are trying to prove
//    and would pass this check on a deployment that happily accepts sign-ups.
const signUp = await fetch(`${base}/api/auth/sign-up/email`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: base },
  body: JSON.stringify({
    email: `probe-${Date.now()}@example.com`,
    password: 'not-a-real-password',
    name: 'probe',
  }),
})

const signUpBody = await signUp.text()
const blockedByCsrf = signUpBody.includes('MISSING_OR_NULL_ORIGIN')

record(
  'DEMO_MODE refuses registration',
  signUp.status === 403 && !blockedByCsrf,
  blockedByCsrf
    ? 'got 403 from the CSRF guard, not the demo hook — this check could not run'
    : `POST /api/auth/sign-up/email returned ${signUp.status}, expected 403`,
)

// 2. The upload route must reject an unauthenticated caller before it does any
//    work. The 50-photo cap is enforced inside that same handler, so an open
//    route would mean an uncapped one.
const upload = await fetch(`${base}/api/photos/upload`, {
  method: 'POST',
  body: new FormData(),
})

record(
  'upload rejects an unauthenticated caller',
  upload.status === 401,
  `POST /api/photos/upload returned ${upload.status}, expected 401`,
)

// 3. The gallery must not be readable without a session.
const gallery = await fetch(`${base}/`, { redirect: 'manual' })
const location = gallery.headers.get('location') ?? ''

record(
  'the gallery redirects an anonymous visitor to /login',
  gallery.status >= 300 && gallery.status < 400 && location.includes('/login'),
  `GET / returned ${gallery.status} → ${location || '(no redirect)'}`,
)

const failed = checks.filter((check) => !check.ok)
console.log(
  `\n${checks.length - failed.length}/${checks.length} checks passed against ${base}`,
)
process.exit(failed.length === 0 ? 0 : 1)
