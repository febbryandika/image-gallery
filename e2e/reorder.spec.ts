import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * Runs against the seeded demo account — `pnpm db:seed` must have been run.
 * The full register → upload → … → delete journey is Phase 12's job (SPEC §8);
 * this file only proves that a reorder saves and survives a reload.
 */
const ALBUM = 'Exteriors'

// These all act on the same seeded album, so they cannot run side by side.
test.describe.configure({ mode: 'serial' })

async function signIn(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill('demo@example.com')
  await page.getByLabel('Password').fill('demo1234')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Photos' })).toBeVisible()
}

async function openAlbum(page: Page): Promise<void> {
  await page.getByRole('link', { name: new RegExp(`^${ALBUM}`) }).click()
  await expect(page.getByRole('heading', { name: ALBUM })).toBeVisible()
}

function handles(page: Page): Locator {
  return page.getByRole('button', { name: /^Reorder / })
}

/** The album's photos in visual order, identified by their alt text. */
function order(page: Page): Promise<string[]> {
  return handles(page).evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('aria-label') ?? ''),
  )
}

/**
 * The handles are disabled while the reorder is in flight, so this is how the
 * test knows the write landed — reloading before it does would abort it.
 */
async function saved(page: Page): Promise<void> {
  await expect(handles(page).first()).toBeEnabled()
}

test.beforeEach(async ({ page }) => {
  // dnd-kit numbers its `aria-describedby` from a module counter that restarts
  // on the server, which mismatched on hydration until DndContext got a fixed
  // id. Fail loudly if that regresses.
  const hydrationErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text().includes('hydrat')) {
      hydrationErrors.push(message.text())
    }
  })

  await signIn(page)
  await openAlbum(page)

  expect(hydrationErrors).toEqual([])
})

test('a photo can be reordered with the keyboard alone, and it persists', async ({
  page,
}) => {
  const before = await order(page)
  expect(before.length).toBeGreaterThan(2)

  // The handle's aria-describedby must resolve to real text, not dangle. The id
  // is pinned on DndContext, so this also guards the hydration fix.
  const handle = page.getByRole('button', { name: before[0] })
  await expect(handle).toHaveAttribute('aria-describedby', 'album-reorder')
  await expect(page.locator('#album-reorder')).toHaveText(/Press Space/)

  // Space to pick up, arrow to move, Space to drop — no mouse involved.
  await handle.focus()
  await page.keyboard.press('Space')
  // dnd-kit measures droppables after the announcement; an arrow key sent into
  // that gap finds no neighbour. aria-pressed means it is really picked up.
  await expect(handle).toHaveAttribute('aria-pressed', 'true')

  // dnd-kit's own live region. Its numeric suffix comes from a module counter,
  // so match the prefix rather than the whole id.
  const liveRegion = page.locator('[id^="DndLiveRegion"]')
  await expect(liveRegion).toContainText('position 1 of')

  await page.keyboard.press('ArrowRight')
  await expect(liveRegion).toContainText('position 2 of')

  await page.keyboard.press('Space')
  await expect(liveRegion).toContainText('dropped at position 2')

  const expected = [before[1], before[0], ...before.slice(2)]
  await expect.poll(() => order(page)).toEqual(expected)

  await saved(page)
  await page.reload()
  await expect.poll(() => order(page)).toEqual(expected)
})

test('a failed save rolls the grid back and says so', async ({ page }) => {
  const before = await order(page)

  // Kill the Server Action request rather than the action itself, so the
  // rollback path is exercised without production code knowing it's a test.
  await page.route(
    (url) => url.pathname.startsWith('/albums/'),
    async (route, request) => {
      if (request.method() === 'POST') return route.abort('failed')
      return route.fallback()
    },
  )

  // Paced by the live region: the sensor has to register each step before the
  // next key arrives, or the three presses collapse into nothing.
  const liveRegion = page.locator('[id^="DndLiveRegion"]')
  const pickedUp = page.getByRole('button', { name: before[0] })
  await pickedUp.focus()
  await page.keyboard.press('Space')
  // dnd-kit measures droppables after the announcement; an arrow key sent into
  // that gap finds no neighbour. aria-pressed means it is really picked up.
  await expect(pickedUp).toHaveAttribute('aria-pressed', 'true')
  await expect(liveRegion).toContainText('position 1 of')
  await page.keyboard.press('ArrowRight')
  await expect(liveRegion).toContainText('position 2 of')
  await page.keyboard.press('Space')

  // The grid must never keep showing an order the server did not accept.
  await expect(page.getByText(/Could not save that order/)).toBeVisible()
  await expect.poll(() => order(page)).toEqual(before)
})

/**
 * dnd-kit only writes an inline transition while a sort is in progress, so the
 * reduced-motion check has to happen mid-drag. Returns the style attribute of a
 * sibling that has been displaced by picking up the first photo.
 */
async function styleOfDisplacedItem(page: Page): Promise<string | null> {
  await expect(handles(page).first()).toBeAttached()
  const first = await order(page)
  const liveRegion = page.locator('[id^="DndLiveRegion"]')

  const pickedUp = page.getByRole('button', { name: first[0] })
  await pickedUp.focus()
  await page.keyboard.press('Space')
  await expect(pickedUp).toHaveAttribute('aria-pressed', 'true')
  await expect(liveRegion).toContainText('position 1 of')
  await page.keyboard.press('ArrowRight')
  await expect(liveRegion).toContainText('position 2 of')

  const style = await page.locator('ul.grid > li').nth(1).getAttribute('style')
  await page.keyboard.press('Escape')
  return style
}

test('reduced motion drops the transition dnd-kit writes inline', async ({
  page,
}) => {
  expect(await styleOfDisplacedItem(page)).toMatch(/transition:/)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()

  expect(await styleOfDisplacedItem(page)).not.toMatch(/transition:/)
})

test('the main gallery keeps its masonry and is not sortable', async ({
  page,
}) => {
  await page.getByRole('link', { name: /^All photos/ }).click()
  await expect(page.getByRole('heading', { name: 'Photos' })).toBeVisible()

  await expect(page.locator('div.columns-1')).toBeVisible()
  await expect(page.getByRole('button', { name: /^Reorder / })).toHaveCount(0)
})

test('a photo can be dragged with the mouse, and it persists', async ({
  page,
}) => {
  const before = await order(page)

  const from = await page.getByRole('button', { name: before[0] }).boundingBox()
  const to = await page.getByRole('button', { name: before[2] }).boundingBox()
  if (!from || !to) throw new Error('Expected both handles to be laid out')

  // Stepped moves: dnd-kit's PointerSensor only activates once the pointer has
  // travelled past its 8px threshold, so a single jump is not a drag.
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
    steps: 12,
  })
  await page.mouse.up()

  const expected = [before[1], before[2], before[0], ...before.slice(3)]
  await expect.poll(() => order(page)).toEqual(expected)

  await saved(page)
  await page.reload()
  await expect.poll(() => order(page)).toEqual(expected)
})
