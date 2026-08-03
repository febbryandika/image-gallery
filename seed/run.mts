/**
 * The seed itself. Loaded by index.mts, which sets up the environment first.
 * Idempotent: wipes the demo user's photos and R2 objects, then pushes every
 * seed image through the *same* pipeline a real upload uses. No Anthropic call
 * — metadata is hardcoded in data.ts so seeding is free and deterministic.
 */

import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { eq } from 'drizzle-orm'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { db } from '@/db'
import { photos } from '@/db/schema'
import { user } from '@/db/auth-schema'
import { auth } from '@/lib/auth'
import { processAndStorePhoto } from '@/lib/photo-pipeline'
import { deleteObject } from '@/lib/r2'
import { SEED_PHOTOS } from './data.ts'

const DEMO_EMAIL = 'demo@example.com'
const DEMO_PASSWORD = 'demo1234'
const IMAGES_DIR = join(import.meta.dirname, 'images')

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

async function findOrCreateDemoUser(): Promise<string> {
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, DEMO_EMAIL))

  if (existing) {
    console.log(`user    ${DEMO_EMAIL} (existing)`)
    return existing.id
  }

  const created = await auth.api.signUpEmail({
    body: { email: DEMO_EMAIL, password: DEMO_PASSWORD, name: 'Demo' },
  })

  console.log(`user    ${DEMO_EMAIL} (created)`)
  return created.user.id
}

/** Everything under this user's prefix, so a re-run starts from nothing. */
async function wipeUserPhotos(userId: string): Promise<void> {
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${requireEnv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    },
  })

  const listed = await s3.send(
    new ListObjectsV2Command({
      Bucket: requireEnv('R2_BUCKET'),
      Prefix: `photos/${userId}/`,
    }),
  )

  const keys = (listed.Contents ?? []).flatMap((object) =>
    object.Key ? [object.Key] : [],
  )

  await Promise.all(keys.map((key) => deleteObject(key)))
  const deleted = await db
    .delete(photos)
    .where(eq(photos.userId, userId))
    .returning({ id: photos.id })

  console.log(`wipe    ${deleted.length} rows, ${keys.length} objects`)
}

async function main(): Promise<void> {
  // seed/images is gitignored — the photographs are local-only, so a fresh
  // clone has the metadata but not the files. Say so plainly instead of
  // failing on ENOENT halfway through.
  const missing = SEED_PHOTOS.filter(
    (entry) => !existsSync(join(IMAGES_DIR, entry.file)),
  )

  if (missing.length > 0) {
    console.error(
      `\nMissing ${missing.length} of ${SEED_PHOTOS.length} files in seed/images/:\n` +
        missing.map((entry) => `  ${entry.file}`).join('\n') +
        '\n\nThe seed photographs are not distributed with this repository.\n' +
        'See seed/CREDITS.md.\n',
    )
    process.exit(1)
  }

  const userId = await findOrCreateDemoUser()
  await wipeUserPhotos(userId)

  for (const entry of SEED_PHOTOS) {
    const input = await readFile(join(IMAGES_DIR, entry.file))
    await processAndStorePhoto({
      userId,
      input,
      metadata: {
        altText: entry.altText,
        description: entry.description,
        tags: entry.tags,
      },
    })
    console.log(`photo   ${entry.file}`)
  }

  console.log(`\ndone    ${SEED_PHOTOS.length} photos for ${DEMO_EMAIL}`)
  process.exit(0)
}

await main()
