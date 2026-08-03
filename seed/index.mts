/**
 * Seed bootstrap (SPEC §9.1).
 *
 *   pnpm db:seed
 *
 * This file exists only to get the environment right *before* any app module
 * is loaded. Static imports are hoisted, so the env setup below has to happen
 * in a module that imports nothing from src/ — hence the dynamic import at the
 * end. The actual work is in run.mts.
 */

import { existsSync } from 'node:fs'

// tsx doesn't read .env the way Next and drizzle-kit do. An explicit
// DATABASE_URL in the environment wins, so production seeding can be run as
// `DATABASE_URL=... pnpm db:seed` on a machine with no .env file.
if (!process.env.DATABASE_URL) {
  for (const file of ['.env', '.env.local']) {
    if (existsSync(file)) process.loadEnvFile(file)
  }
}

// The sign-up gate in src/lib/auth.ts refuses when DEMO_MODE is true, which is
// exactly what the deployed demo wants. Seeding is the operator, not a visitor.
process.env.DEMO_MODE = 'false'

await import('./run.mts')
