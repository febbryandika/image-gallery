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

The reorder end-to-end tests sign in as the demo account and rearrange a seeded album, so
run `pnpm db:seed` before `pnpm test:e2e`.

`pnpm db:seed` needs the demo photographs in `seed/images/`. They are not distributed
with this repository — see [seed/CREDITS.md](seed/CREDITS.md).

## Accessibility

Accessibility is the point of this project, so it is tested rather than asserted.
`pnpm test:e2e` runs axe (`@axe-core/playwright`) over the gallery, the upload page, an album
page, an open lightbox and an open menu, failing on any serious or critical violation; a
second suite drives every flow with the keyboard alone and never calls `click()`.

What that covers:

- **Keyboard only.** Login, upload, metadata editing, album create/rename/delete, moving a
  photo, drag-to-reorder, the lightbox and delete all work without a mouse. A skip link is the
  first stop on the page. Controls that are visually quiet until hover are still reachable by
  Tab and become fully visible when focused.
- **The lightbox** traps focus, closes on `Esc`, and returns focus to the card that opened it.
  `←`/`→` move between photos.
- **Reorder** works with the keyboard through dnd-kit's `KeyboardSensor` — `Space` to pick up,
  arrows to move, `Space` to drop, `Esc` to cancel — and announces pick-up, move and drop
  through a live region.
- **Alt text** is generated on upload and editable. Every thumbnail renders the stored text,
  and a photo with none shows a visible "Add alt text" badge to its owner.
- **`prefers-reduced-motion`** removes dialog, menu and skeleton animation, and drops the
  inline transition dnd-kit writes during a drag.

Fixed during the accessibility pass, all found by testing rather than reading:

| Problem | Fix |
|---|---|
| Closing the lightbox dropped focus on `<body>` instead of returning it to the card — the dialog unmounted before Radix could run its close sequence | Keep it mounted with `open={false}` |
| The album row's ⋯ button never appeared on hover: its named-group Tailwind variant generated no CSS at all | Use the plain `group` variant |
| Menus marked the rest of the page `aria-hidden` while leaving it focusable (`aria-hidden-focus`) | Non-modal menus |
| 12px counts on the active sidebar row were 4.35:1 | Darkened `--muted-foreground` to clear 4.5:1 everywhere |
| Upload progress and "Saved" mounted their live region together with its text, so nothing was announced | Persistent live regions |
| Dialog, menu and skeleton animation ignored `prefers-reduced-motion` | Guarded in the primitives |

The login form uses real labels, wires validation errors to their inputs with
`aria-describedby`, announces form-level errors through a live region, and submits without
JavaScript — as does the search field.
