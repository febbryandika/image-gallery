import { anthropic } from '@ai-sdk/anthropic'
import { generateObject } from 'ai'
import { z } from 'zod'
import type { PhotoMetadata } from '@/lib/photo-pipeline'
import {
  MAX_ALT_TEXT_LENGTH,
  MAX_TAGS_PER_PHOTO,
  normalizeTags,
} from '@/lib/validation'

// Cheap enough to run on every upload; SPEC §7 is explicit about credit spend
// on a public demo. Any environment can override via ANTHROPIC_MODEL.
const DEFAULT_MODEL = 'claude-haiku-4-5'

/**
 * Shape only — deliberately no `.max()` constraints. generateObject throws when
 * the response fails validation, and a model that overshoots 125 characters by
 * a few would otherwise cost us the whole description. The limits are enforced
 * below instead, where a too-long answer is trimmed rather than discarded.
 */
const schema = z.object({
  altText: z
    .string()
    .describe(
      `Alt text for screen readers describing what the photo shows, under ${MAX_ALT_TEXT_LENGTH} characters`,
    ),
  description: z.string().describe('One sentence describing the image'),
  tags: z
    .array(z.string())
    .describe(
      `Subject, setting, colors, mood. At most ${MAX_TAGS_PER_PHOTO} tags`,
    ),
})

const EMPTY: PhotoMetadata = { altText: '', description: '', tags: [] }

/**
 * What `VISION_STUB=true` returns instead of calling Anthropic. Deterministic
 * so the end-to-end suite can assert on it, and free so CI never needs a key.
 */
const STUB: PhotoMetadata = {
  altText: 'A stubbed description used by the test suite',
  description: 'Generated without calling the vision model.',
  tags: ['stub', 'test'],
}

/** Trims at a word boundary where possible so alt text doesn't end mid-word. */
function clampAltText(altText: string): string {
  const trimmed = altText.trim()
  if (trimmed.length <= MAX_ALT_TEXT_LENGTH) return trimmed

  const cut = trimmed.slice(0, MAX_ALT_TEXT_LENGTH)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > MAX_ALT_TEXT_LENGTH * 0.6 ? cut.slice(0, lastSpace) : cut)
    .trimEnd()
    .replace(/[,;:]$/, '')
}

/**
 * The project's single AI call (SPEC §4.2). Deliberately never throws: a vision
 * failure saves the photo with empty metadata and the upload form prompts the
 * user to fill it in. No retries, no streaming, no batching.
 *
 * The *thumbnail* bytes are sent, not a URL — ~40KB instead of a full-size
 * image, and it doesn't require the bucket to be publicly readable first.
 */
export async function describeImage(thumbnail: Buffer): Promise<PhotoMetadata> {
  // The one branch that keeps CI free of an Anthropic key (SPEC §8 asks for the
  // vision call to be stubbed there). Same shape as the DEMO_MODE switch.
  if (process.env.VISION_STUB === 'true') return STUB

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

    return {
      altText: clampAltText(object.altText),
      description: object.description.trim(),
      tags: normalizeTags(object.tags),
    }
  } catch {
    return EMPTY
  }
}
