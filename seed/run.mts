/**
 * The seed itself. Loaded by index.mts, which sets up the environment first.
 * Idempotent: wipes the demo user's photos and R2 objects, then pushes every
 * seed image through the *same* pipeline a real upload uses. No Anthropic call
 * — metadata is hardcoded in data.ts so seeding is free and deterministic.
 */

import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { eq } from 'drizzle-orm'
import sharp from 'sharp'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { db } from '@/db'
import { albums, photos } from '@/db/schema'
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

/**
 * Creates one album per distinct name in the seed data and returns a name → id
 * map. The albums table was wiped first, so this always inserts fresh rows.
 */
async function createAlbums(userId: string): Promise<Map<string, string>> {
  const names = [
    ...new Set(SEED_PHOTOS.flatMap((entry) => entry.album ?? [])),
  ].sort()

  if (names.length === 0) return new Map()

  const created = await db
    .insert(albums)
    .values(names.map((name) => ({ userId, name })))
    .returning({ id: albums.id, name: albums.name })

  console.log(`albums  ${created.map((album) => album.name).join(', ')}`)
  return new Map(created.map((album) => [album.name, album.id]))
}

/**
 * A stand-in photograph for a clone that has none. Deliberately boring: a flat
 * duotone at a plausible aspect ratio, distinct per index so the grid does not
 * look like one image repeated. Goes through the same Sharp + R2 pipeline a
 * real upload does, which is the point of the seed (SPEC §9.1).
 */
async function placeholderImage(index: number): Promise<Buffer> {
  const hue = (index * 47) % 360
  const { width, height } = [
    { width: 1200, height: 800 },
    { width: 800, height: 1200 },
    { width: 1000, height: 1000 },
  ][index % 3]!

  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
             <defs>
               <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                 <stop offset="0%" stop-color="hsl(${hue} 55% 62%)" />
                 <stop offset="100%" stop-color="hsl(${(hue + 40) % 360} 45% 32%)" />
               </linearGradient>
             </defs>
             <rect width="100%" height="100%" fill="url(#g)" />
           </svg>`,
        ),
        top: 0,
        left: 0,
      },
    ])
    .jpeg({ quality: 80 })
    .toBuffer()
}

/** Everything under this user's prefix, so a re-run starts from nothing. */
async function wipeUserPhotos(userId: string): Promise<void> {
  // Mirrors src/lib/r2.ts: R2_ENDPOINT lets something S3-compatible stand in,
  // which is how a clone and CI run this without a Cloudflare account.
  const override = process.env.R2_ENDPOINT
  const s3 = new S3Client({
    region: 'auto',
    endpoint:
      override ??
      `https://${requireEnv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    forcePathStyle: Boolean(override),
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

  // After the photos, so the FK's ON DELETE SET NULL has nothing left to do.
  const droppedAlbums = await db
    .delete(albums)
    .where(eq(albums.userId, userId))
    .returning({ id: albums.id })

  console.log(
    `wipe    ${deleted.length} rows, ${keys.length} objects, ${droppedAlbums.length} albums`,
  )
}

async function main(): Promise<void> {
  // seed/images is gitignored — the photographs are the owner's own work and
  // stay on the development machine (seed/CREDITS.md). A fresh clone therefore
  // has the metadata but not the files, so it gets generated stand-ins instead
  // of a dead end: the gallery is plain, but every other step works.
  const missing = SEED_PHOTOS.filter(
    (entry) => !existsSync(join(IMAGES_DIR, entry.file)),
  )
  const usePlaceholders = missing.length > 0

  if (usePlaceholders) {
    console.log(
      `images  ${missing.length} of ${SEED_PHOTOS.length} missing — using generated placeholders`,
    )
  }

  const userId = await findOrCreateDemoUser()
  await wipeUserPhotos(userId)
  const albumIds = await createAlbums(userId)

  for (const [index, entry] of SEED_PHOTOS.entries()) {
    const input = usePlaceholders
      ? await placeholderImage(index)
      : await readFile(join(IMAGES_DIR, entry.file))

    await processAndStorePhoto({
      userId,
      input,
      albumId: entry.album ? albumIds.get(entry.album) : undefined,
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
