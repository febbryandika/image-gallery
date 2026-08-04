import { expect, test, type Page } from '@playwright/test'
import { join } from 'node:path'

/**
 * The one end-to-end journey SPEC §8 names, start to finish:
 * login → upload → AI metadata appears → edit alt text → save → visible in the
 * grid → assign to an album → reorder → delete.
 *
 * Needs `VISION_STUB=true` so the metadata is deterministic and no Anthropic
 * credit is spent, and a seeded demo account (`pnpm db:seed`).
 */

const FIXTURE = join(__dirname, 'fixtures', 'upload.jpg')

/** What src/lib/vision.ts returns under VISION_STUB. */
const STUB_ALT = 'A stubbed description used by the test suite'
const EDITED_ALT = 'A red brick wall photographed head on'
const ALBUM = 'Interiors'

async function signIn(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill('demo@example.com')
  await page.getByLabel('Password').fill('demo1234')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Photos' })).toBeVisible()
}

test('a photo can be uploaded, described, filed, reordered and deleted', async ({
  page,
}) => {
  test.skip(
    process.env.VISION_STUB !== 'true',
    'Needs VISION_STUB=true so the metadata is deterministic',
  )
  test.slow() // Sharp plus two object writes; the default 30s is tight.

  await signIn(page)

  // --- upload ------------------------------------------------------------
  await page.goto('/upload')
  await page.getByLabel('Photos').setInputFiles(FIXTURE)
  await page.getByRole('button', { name: 'Upload' }).click()

  // --- the AI metadata comes back and is editable ------------------------
  // Exact: the sidebar's "Search alt text" would otherwise match too.
  const altField = page.getByLabel('Alt text', { exact: true })
  await expect(altField).toHaveValue(STUB_ALT, { timeout: 30_000 })
  await expect(page.getByLabel('Tags')).toHaveValue(/stub/)

  await altField.fill(EDITED_ALT)
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Saved')).toBeVisible()

  // --- it is in the grid, with the alt text we saved ----------------------
  await page.goto('/')
  const card = page.getByRole('button', { name: `Open photo: ${EDITED_ALT}` })
  await expect(card).toBeVisible()

  // --- assign it to an album ---------------------------------------------
  await page
    .getByRole('button', { name: `Move “${EDITED_ALT}” to an album` })
    .click()
  await page.getByRole('menuitemradio', { name: ALBUM }).click()

  await page.getByRole('link', { name: new RegExp(`^${ALBUM}`) }).click()
  await expect(page.getByRole('heading', { name: ALBUM })).toBeVisible()
  await expect(
    page.getByRole('button', { name: `Open photo: ${EDITED_ALT}` }),
  ).toBeVisible()

  // --- reorder it within that album --------------------------------------
  const handles = page.getByRole('button', { name: /^Reorder / })
  const before = await handles.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('aria-label') ?? ''),
  )
  expect(before.length).toBeGreaterThan(1)

  // The grid must be settled before a drag: dnd-kit resolves the drop target
  // geometrically, and the newly uploaded image is still reflowing it.
  await page.waitForFunction(() =>
    [...document.querySelectorAll('ul.grid img')].every(
      (img) => (img as HTMLImageElement).complete,
    ),
  )

  // Dragged with the mouse here. Keyboard reorder — pick up, arrow, drop, and
  // its announcements — is covered thoroughly in reorder.spec.ts; repeating it
  // inside the journey added no coverage and a lot of timing sensitivity.
  const from = await page.getByRole('button', { name: before[0] }).boundingBox()
  const to = await page.getByRole('button', { name: before[1] }).boundingBox()
  if (!from || !to) throw new Error('Expected both handles to be laid out')

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
    steps: 12,
  })
  await page.mouse.up()

  const expected = [before[1], before[0], ...before.slice(2)]
  await expect
    .poll(() =>
      handles.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('aria-label') ?? ''),
      ),
    )
    .toEqual(expected)

  // Handles disable while the write is in flight; wait rather than race it.
  await expect(handles.first()).toBeEnabled()
  await page.reload()
  await expect
    .poll(() =>
      handles.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('aria-label') ?? ''),
      ),
    )
    .toEqual(expected)

  // --- delete it ----------------------------------------------------------
  await page.getByRole('button', { name: `Delete “${EDITED_ALT}”` }).click()
  // Scoped to the dialog: the card's own trigger also starts with "Delete".
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Delete', exact: true })
    .click()

  await expect(
    page.getByRole('button', { name: `Open photo: ${EDITED_ALT}` }),
  ).toHaveCount(0)

  // And it is gone from the gallery too, not just the album it was filed in.
  // Reload between checks: the album view above already proves the row is
  // deleted, so anything still on screen here is a cached render, and one
  // navigation is not always enough to get past it.
  await expect
    .poll(
      async () => {
        await page.goto('/')
        return page
          .getByRole('button', { name: `Open photo: ${EDITED_ALT}` })
          .count()
      },
      { timeout: 15_000 },
    )
    .toBe(0)
})
