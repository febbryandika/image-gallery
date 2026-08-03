import { anthropic } from '@ai-sdk/anthropic'
import { generateObject } from 'ai'
import { z } from 'zod'
import type { PhotoMetadata } from '@/lib/photo-pipeline'
import { MAX_TAGS_PER_PHOTO, normalizeTags } from '@/lib/validation'

// Cheap enough to run on every upload; SPEC §7 is explicit about credit spend
// on a public demo. Any environment can override via ANTHROPIC_MODEL.
const DEFAULT_MODEL = 'claude-haiku-4-5'

const schema = z.object({
  altText: z
    .string()
    .max(125)
    .describe('Alt text for screen readers, describing what the photo shows'),
  description: z.string().describe('One sentence describing the image'),
  tags: z
    .array(z.string())
    .max(MAX_TAGS_PER_PHOTO)
    .describe('Subject, setting, colors, mood'),
})

const EMPTY: PhotoMetadata = { altText: '', description: '', tags: [] }

/**
 * The project's single AI call (SPEC §4.2). Deliberately never throws: a vision
 * failure saves the photo with empty metadata and the upload form prompts the
 * user to fill it in. No retries, no streaming, no batching.
 *
 * The *thumbnail* bytes are sent, not a URL — ~40KB instead of a full-size
 * image, and it doesn't require the bucket to be publicly readable first.
 */
export async function describeImage(thumbnail: Buffer): Promise<PhotoMetadata> {
  try {
    const { object } = await generateObject({
      model: anthropic(process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL),
      schema,
      messages: [
        {
          role: 'user',
          content: [
            // AI SDK 7 replaced the old `{ type: 'image', image }` part.
            { type: 'file', mediaType: 'image/webp', data: thumbnail },
            { type: 'text', text: 'Describe this image for a photo gallery.' },
          ],
        },
      ],
    })

    return { ...object, tags: normalizeTags(object.tags) }
  } catch {
    return EMPTY
  }
}
