import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

export type PhotoVariant = 'full' | 'thumb'

const R2_ENV_KEYS = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_PUBLIC_URL',
] as const

/**
 * Reports every missing variable in one error rather than letting an undefined
 * surface as a confusing SDK failure later. Checked on use, not at module load,
 * so builds and typechecks stay green on a clone with no credentials.
 */
function requireEnv(key: (typeof R2_ENV_KEYS)[number]): string {
  const missing = R2_ENV_KEYS.filter((name) => !process.env[name])
  if (missing.length > 0) {
    throw new Error(
      `Missing R2 environment variables: ${missing.join(', ')}. ` +
        'Copy .env.example to .env and fill them in.',
    )
  }

  const value = process.env[key]
  if (!value) throw new Error(`Missing R2 environment variable: ${key}`)
  return value
}

let client: S3Client | null = null

function s3(): S3Client {
  if (!client) {
    client = new S3Client({
      // 'auto' is required by the SDK and ignored by R2.
      region: 'auto',
      endpoint: `https://${requireEnv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
        secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
      },
    })
  }
  return client
}

export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> {
  await s3().send(
    new PutObjectCommand({
      Bucket: requireEnv('R2_BUCKET'),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
}

export async function deleteObject(key: string): Promise<void> {
  await s3().send(
    new DeleteObjectCommand({
      Bucket: requireEnv('R2_BUCKET'),
      Key: key,
    }),
  )
}

/**
 * The only place a photo URL is constructed. The database stores `storageKey`
 * and nothing else, so the bucket hostname lives in one env var (SPEC §3).
 */
export function publicUrl(storageKey: string, variant: PhotoVariant): string {
  const base = requireEnv('R2_PUBLIC_URL').replace(/\/+$/, '')
  const suffix = variant === 'thumb' ? '_thumb.webp' : '.webp'
  return `${base}/${storageKey}${suffix}`
}
