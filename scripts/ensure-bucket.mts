/**
 * Creates the bucket and opens it for anonymous reads.
 *
 * Only ever pointed at a throwaway S3-compatible server (MinIO in CI) via
 * R2_ENDPOINT — it refuses to run without one, so it can never touch the real
 * R2 bucket. Uses the AWS SDK the app already depends on, so CI needs no `mc`.
 */

import { existsSync } from 'node:fs'
import {
  CreateBucketCommand,
  PutBucketPolicyCommand,
  S3Client,
} from '@aws-sdk/client-s3'

// tsx doesn't read .env the way Next does; an explicit environment wins, so CI
// can pass everything inline. Same approach as seed/index.mts.
if (!process.env.R2_ENDPOINT) {
  for (const file of ['.env', '.env.local']) {
    if (existsSync(file)) process.loadEnvFile(file)
  }
}

const endpoint = process.env.R2_ENDPOINT
const bucket = process.env.R2_BUCKET

if (!endpoint) {
  console.error('Refusing to run without R2_ENDPOINT — this is for MinIO only.')
  process.exit(1)
}
if (!bucket) {
  console.error('Missing R2_BUCKET')
  process.exit(1)
}

const s3 = new S3Client({
  region: 'auto',
  endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  },
})

try {
  await s3.send(new CreateBucketCommand({ Bucket: bucket }))
  console.log(`bucket  ${bucket} created`)
} catch (error) {
  // Re-running the job must not fail; the bucket already existing is success.
  const name = error instanceof Error ? error.name : ''
  if (name !== 'BucketAlreadyOwnedByYou' && name !== 'BucketAlreadyExists') {
    throw error
  }
  console.log(`bucket  ${bucket} already exists`)
}

// next/image fetches thumbnails server-side over this URL, so it has to be
// readable without signing — the same as R2's public development URL.
await s3.send(
  new PutBucketPolicyCommand({
    Bucket: bucket,
    Policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucket}/*`],
        },
      ],
    }),
  }),
)

console.log(`policy  ${bucket} is publicly readable`)
