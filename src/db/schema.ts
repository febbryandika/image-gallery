import { createId } from '@paralleldrive/cuid2'
import { sql } from 'drizzle-orm'
import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const albums = pgTable(
  'albums',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index('idx_album_user').on(t.userId)],
)

export const photos = pgTable(
  'photos',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('user_id').notNull(),
    albumId: text('album_id').references(() => albums.id, {
      onDelete: 'set null',
    }),
    // photos/{userId}/{id} — URLs are derived from this, never stored (SPEC §3).
    storageKey: text('storage_key').notNull(),
    altText: text('alt_text').notNull().default(''),
    description: text('description').notNull().default(''),
    tags: text('tags')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    // order within an album — plain integers, not fractional indexing (SPEC §4.3)
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index('idx_photo_user_created').on(t.userId, t.createdAt),
    index('idx_photo_album_position').on(t.albumId, t.position),
  ],
)
