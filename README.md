# Image Gallery

A personal photo gallery with automatic AI alt text and a fully keyboard-operable UI.

## Local setup

```bash
pnpm install
cp .env.example .env.local
docker compose up -d
pnpm dev
```

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
