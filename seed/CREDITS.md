# Seed image credits

## Not distributed with this repository

`seed/images/` is gitignored. The photographs are the repository owner's own
work and are kept **local to the development machine** — they are not committed,
not published to GitHub, and not part of any clone.

`seed/data.ts` still lists the metadata for each file, so the seed is
reproducible for anyone who has the photographs on disk. Without them,
`pnpm db:seed` reports which files are missing and exits.

## Source and rights

All photographs are © Febbry Andika, shot on location at the coffee shops
listed below. All rights reserved. They are **not** offered under an open
licence and are not to be reused independently of this project.

The venues appear as the subject of the photographs. Their names, signage and
branding remain the property of their respective owners.

## Venues

| File                                  | Venue                |
| ------------------------------------- | -------------------- |
| `48-street-001.jpg`                   | 48 Street            |
| `48-street-003.jpg`                   | 48 Street            |
| `bagi-kopi-signature-001.jpg`         | Bagi Kopi Signature  |
| `daruma-001.jpg`                      | Daruma               |
| `daruma-003.jpg`                      | Daruma               |
| `handoko-001.jpg`                     | Handoko              |
| `handoko-004.jpg`                     | Handoko              |
| `imadji-coffee-001.jpg`               | Imadji Coffee        |
| `kalibata-house-21-001.jpg`           | Kalibata House 21    |
| `kopi-toko-djawa-critical-11-001.jpg` | Kopi Toko Djawa      |
| `kopi-toko-djawa-critical-11-003.jpg` | Kopi Toko Djawa      |
| `mahboen-coffee-001.jpg`              | Mahboen Coffee       |
| `mahboen-coffee-004.jpg`              | Mahboen Coffee       |
| `nest-004.jpg`                        | Nest Coffee & Donuts |
| `over-the-moon-001.jpg`               | Over the Moon        |
| `over-the-moon-004.jpg`               | Over the Moon        |
| `qual-coffee-001.jpg`                 | Qual Coffee          |
| `qual-coffee-003.jpg`                 | Qual Coffee          |
| `sedjuk-bakmi-kopi-001.jpg`           | Sedjuk Bakmi & Kopi  |
| `sedjuk-bakmi-kopi-004.jpg`           | Sedjuk Bakmi & Kopi  |

Each file is re-encoded with MozJPEG to stay under 300KB, so pushing them
through R2 stays quick.

## Seeding production

Because the images live only on the development machine, the production seed is
run from there against the deployed database:

```bash
DATABASE_URL='<neon-pooled-url>' pnpm db:seed
```
