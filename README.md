# Image Gallery

A personal photo gallery with automatic AI alt text and a fully keyboard-operable UI.

## Live demo

<!-- Filled in once the Vercel deploy is live. -->

**URL:** _pending first deploy_

| Email              | Password   |
| ------------------ | ---------- |
| `demo@example.com` | `demo1234` |

Registration is disabled on the demo instance, so the demo account is the way in.

## Local setup

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
pnpm dev
```

Set `BETTER_AUTH_SECRET` in `.env` before starting — `openssl rand -base64 32`.

Use `.env`, not `.env.local`: Next.js and drizzle-kit both read it, so one file drives
the app and the migration commands.

Postgres is published on host port `5436` — `5432` is usually taken by a native install.

## Scripts

| Script             | What it does                       |
| ------------------ | ---------------------------------- |
| `pnpm dev`         | dev server                         |
| `pnpm build`       | production build                   |
| `pnpm lint`        | eslint                             |
| `pnpm typecheck`   | `next typegen` then `tsc --noEmit` |
| `pnpm test`        | vitest                             |
| `pnpm test:e2e`    | playwright                         |
| `pnpm format`      | prettier                           |
| `pnpm db:generate` | drizzle-kit generate               |
| `pnpm db:migrate`  | apply migrations                   |
| `pnpm db:push`     | push schema (local dev)            |
| `pnpm db:seed`     | demo user + photos                 |

The `db:*` scripts need `DATABASE_URL` set. Before the first `pnpm test:e2e`, install the
browser once with `pnpm exec playwright install chromium`.

`pnpm db:seed` needs the demo photographs in `seed/images/`. They are not distributed
with this repository — see [seed/CREDITS.md](seed/CREDITS.md).

## Accessibility

Every flow is keyboard-operable. The login form uses real labels, wires validation errors
to their inputs with `aria-describedby`, announces form-level errors through a live region,
and submits without JavaScript.
