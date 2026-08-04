# Deploying

The app is a single Next.js project with no build steps beyond `next build`, so Vercel's
defaults work. What needs care is the environment and the order of the first deploy.

## 1. Provision the two services

**Neon** (Postgres) — create a database and copy its pooled connection string.

**Cloudflare R2** — create a bucket, then an API token scoped to it (Object Read & Write).
Enable the bucket's **Public Development URL** under Settings, or attach a custom domain;
`R2_PUBLIC_URL` has to be readable without signing, because `next/image` fetches thumbnails
from it server-side.

## 2. Environment variables

Set these on the Vercel project (Production, and Preview if you use it):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | the deployment's own URL, e.g. `https://your-app.vercel.app` |
| `R2_ACCOUNT_ID` | Cloudflare account id |
| `R2_ACCESS_KEY_ID` | R2 token id |
| `R2_SECRET_ACCESS_KEY` | R2 token secret |
| `R2_BUCKET` | bucket name |
| `R2_PUBLIC_URL` | e.g. `https://pub-….r2.dev` |
| `ANTHROPIC_API_KEY` | for alt text |
| `ANTHROPIC_MODEL` | optional, defaults to `claude-haiku-4-5` |
| `DEMO_MODE` | **`true`** on the public demo |

Do **not** set `R2_ENDPOINT` or `VISION_STUB` in production. `R2_ENDPOINT` exists so a clone
and CI can point at MinIO instead of R2; `VISION_STUB` replaces the Anthropic call with fixed
text. Either one set in production would silently change behaviour.

`R2_PUBLIC_URL`'s hostname is added to `next.config.ts` `images.remotePatterns` automatically,
so it must be present **at build time** — set it before the first deploy, not after.

## 3. Push the schema, then seed

Both run from your machine against the production database:

```bash
DATABASE_URL='<neon-url>' pnpm db:push
DATABASE_URL='<neon-url>' R2_ACCOUNT_ID=… R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=… \
  R2_BUCKET=… R2_PUBLIC_URL=… pnpm db:seed
```

The seed wipes and recreates the demo user's rows, so it is safe to re-run. It sets
`DEMO_MODE=false` for its own process — the deployment's own `DEMO_MODE=true` is untouched.

Without `seed/images/` on the machine you run it from, the seed generates placeholder images
instead of the real photographs (see [../seed/CREDITS.md](../seed/CREDITS.md)). For the public
demo you want the real ones, so run it from a machine that has them.

## 4. Verify the deployment

```bash
pnpm verify:production https://your-app.vercel.app
```

Checks the three things that are only observable in production:

1. `DEMO_MODE=true` refuses registration at the endpoint with **403** — not merely hiding the
   button, and not the 400 that `disableSignUp` would give.
2. `POST /api/photos/upload` refuses an unauthenticated caller with **401**. The 50-photo cap
   is enforced inside that handler, so an open route would be an uncapped one.
3. `GET /` redirects an anonymous visitor to `/login`.

Then sign in as the demo account once by hand and confirm a photo renders — that is the only
way to be sure `R2_PUBLIC_URL` is genuinely public, since a private bucket fails at
`next/image` rather than at any of the checks above.

## The 50-photo cap

Enforced in the upload route by counting the caller's rows before inserting, answering **409**
with a message naming the limit (SPEC §7). To see it, the demo account has to actually reach
50 photos; the seed creates 20, so it is not reachable by the seed alone. `MAX_PHOTOS_PER_ACCOUNT`
in [../src/lib/validation.ts](../src/lib/validation.ts) is the single source of that number, and
the route's behaviour at the cap is covered by a unit test.
