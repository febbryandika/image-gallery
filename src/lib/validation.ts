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

export const MAX_TAG_LENGTH = 30
export const MAX_TAGS_PER_PHOTO = 8

/**
 * Lowercase, trim, drop empties, dedupe, cap length and count (SPEC §7).
 * Applied to model output *and* to user-entered tags — the client's list is
 * never trusted, so the Server Action runs this again on whatever it receives.
 */
export function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>()

  for (const raw of tags) {
    const tag = raw.trim().toLowerCase().slice(0, MAX_TAG_LENGTH).trim()
    if (tag) seen.add(tag)
    if (seen.size >= MAX_TAGS_PER_PHOTO) break
  }

  return [...seen]
}

/** Shared by the upload form and the updatePhoto Server Action. */
export const updatePhotoSchema = z.object({
  altText: z.string().max(125, 'Alt text must be under 125 characters'),
  description: z.string().max(500, 'Description must be under 500 characters'),
  tags: z.array(z.string()),
  albumId: z.string().nullable().optional(),
})

export type UpdatePhotoInput = z.infer<typeof updatePhotoSchema>
