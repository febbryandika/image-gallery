import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as authSchema from './auth-schema'
import * as schema from './schema'

// Pool is lazy — it does not connect until the first query. Constructing it with
// an undefined connection string is what keeps `next build` working on a clone
// with no database, so do not throw here.
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// Passing the full schema means the Better Auth Drizzle adapter can resolve its
// tables from db._.fullSchema, so src/lib/auth.ts never has to import them.
export const db = drizzle(pool, { schema: { ...schema, ...authSchema } })
