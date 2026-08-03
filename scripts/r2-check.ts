// Round-trips one object through R2 to prove the bucket, credentials and
// public URL all work (SPEC §11 step 3). Not part of the app or the build.
//
//   node --env-file=.env scripts/r2-check.ts
//
// Set R2_CHECK_PAUSE_MS to hold the object open long enough to load the
// printed URL in a browser before it is deleted.

import { deleteObject, publicUrl, putObject } from '../src/lib/r2.ts'

// A 1x1 WebP. Sharp does not arrive until Phase 4, so the bytes are inline.
const ONE_PIXEL_WEBP =
  'UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA='

function fail(message: string): never {
  console.error(`FAIL  ${message}`)
  process.exit(1)
}

function buildImage(): Uint8Array {
  const bytes = Buffer.from(ONE_PIXEL_WEBP, 'base64')
  const isWebp =
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP'

  if (!isWebp) fail('the embedded literal is not a valid WebP')
  return bytes
}

async function main(): Promise<void> {
  const image = buildImage()
  // Matches the real key shape from SPEC §4.1, minus a user id.
  const storageKey = `r2-check/${Date.now()}`
  const objectKey = `${storageKey}.webp`
  const url = publicUrl(storageKey, 'full')

  console.log(`put    ${objectKey} (${image.byteLength} bytes)`)
  await putObject(objectKey, image, 'image/webp')

  console.log(`url    ${url}`)

  const found = await fetch(url)
  if (!found.ok) {
    fail(
      `GET returned ${found.status}. If this is 401 the bucket has no public ` +
        'access — enable the r2.dev URL or attach a custom domain.',
    )
  }

  const contentType = found.headers.get('content-type')
  if (contentType !== 'image/webp') {
    fail(`expected content-type image/webp, got ${contentType}`)
  }
  console.log(`get    ${found.status} ${contentType}`)

  const pauseMs = Number(process.env.R2_CHECK_PAUSE_MS ?? 0)
  if (pauseMs > 0) {
    console.log(`pause  open the URL now — deleting in ${pauseMs / 1000}s`)
    await new Promise((resolve) => setTimeout(resolve, pauseMs))
  }

  await deleteObject(objectKey)
  console.log(`delete ${objectKey}`)

  const gone = await fetch(url, { cache: 'no-store' })
  if (gone.ok) fail(`GET still returned ${gone.status} after delete`)
  console.log(`get    ${gone.status} after delete`)

  console.log('PASS   round-trip complete')
}

await main()
