import { z } from 'zod'

/**
 * Shared by the login form and the auth Server Action. The client parse is
 * convenience; the server parses again and never trusts the first result.
 */
export const credentialsSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be under 128 characters'),
})

export type Credentials = z.infer<typeof credentialsSchema>

/**
 * Vercel caps serverless request bodies at 4.5MB. One constant, checked on the
 * client for convenience and on the server for real (SPEC §4.1).
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

/** What the client may claim. Sharp's sniffed format is checked separately. */
export const ALLOWED_UPLOAD_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

/** Every upload spends Anthropic credit and R2 storage (SPEC §7). */
export const MAX_PHOTOS_PER_ACCOUNT = 50
