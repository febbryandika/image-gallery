import { expect, test, type Page } from '@playwright/test'

/** Runs against the seeded demo account — `pnpm db:seed` must have been run. */
const TAG = 'exterior'

async function signIn(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill('demo@example.com')
  await page.getByLabel('Password').fill('demo1234')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Photos' })).toBeVisible()
}

function cards(page: Page) {
  return page.getByRole('button', { name: /^Open photo/ })
}

/**
 * Counting straight after a navigation races the streamed grid, so wait until
 * the page has settled into either photos or an empty state before reading it.
 */
async function settledCount(page: Page): Promise<number> {
  await expect
    .poll(async () => {
      if ((await cards(page).count()) > 0) return true
      return page
        .getByRole('heading', { name: /^No photos/ })
        .isVisible()
        .catch(() => false)
    })
    .toBe(true)

  return cards(page).count()
}

/**
 * After applying a filter the old grid lingers for a moment, and a form
 * submission passes through zero cards on the way — so wait for a count that is
 * both smaller than before and actually populated.
 */
async function narrowedCount(page: Page, previous: number): Promise<number> {
  await expect
    .poll(async () => {
      const now = await cards(page).count()
      return now > 0 && now < previous
    })
    .toBe(true)

  return cards(page).count()
}

test.beforeEach(async ({ page }) => {
  await signIn(page)
})

test('a tag filter narrows the grid and survives a reload', async ({
  page,
}) => {
  const all = await settledCount(page)

  await page.getByRole('link', { name: new RegExp(`^${TAG}`) }).click()
  await expect(page).toHaveURL(`/?tag=${TAG}`)

  const filtered = await narrowedCount(page, all)
  expect(filtered).toBeGreaterThan(0)

  // The whole point of keeping filter state in the URL (SPEC §5).
  await page.reload()
  await expect(cards(page)).toHaveCount(filtered)
})

test('a tag and a search compose, and the URL carries both', async ({
  page,
}) => {
  await page.goto(`/?tag=${TAG}`)
  const tagOnly = await settledCount(page)

  await page.getByLabel('Search alt text').fill('cafe')
  await page.getByRole('button', { name: 'Search' }).click()

  await expect(page).toHaveURL(`/?q=cafe&tag=${TAG}`)

  const both = await narrowedCount(page, tagOnly)
  expect(both).toBeGreaterThan(0)

  // Every result satisfies both halves of the filter.
  for (const label of await cards(page).evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('aria-label') ?? ''),
  )) {
    expect(label.toLowerCase()).toContain('cafe')
  }
})

test('clicking the active tag clears it', async ({ page }) => {
  await page.goto(`/?tag=${TAG}`)

  await page.getByRole('link', { name: new RegExp(`^${TAG}`) }).click()

  await expect(page).toHaveURL('/')
})

test('a filter that matches nothing offers a way out', async ({ page }) => {
  await page.goto('/?tag=nothing-has-this-tag')

  await expect(
    page.getByRole('heading', { name: /No photos tagged/ }),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Clear filters' }).click()

  await expect(page).toHaveURL('/')
  await expect(cards(page).first()).toBeVisible()
})

test('a search for % matches literally, not everything', async ({ page }) => {
  const all = await settledCount(page)

  await page.goto('/?q=%25')

  // Unescaped, the LIKE wildcard would have matched every photo.
  await expect(cards(page)).toHaveCount(0)
  expect(all).toBeGreaterThan(0)
})

test('filters reach the album route and suspend reordering there', async ({
  page,
}) => {
  await page.getByRole('link', { name: /^Exteriors/ }).click()
  await expect(page.getByRole('heading', { name: 'Exteriors' })).toBeVisible()
  const unfiltered = await settledCount(page)

  await page.getByRole('link', { name: /^signage/ }).click()

  const filtered = await narrowedCount(page, unfiltered)
  expect(filtered).toBeGreaterThan(0)

  // Reordering a subset would renumber `position` for only the visible photos.
  await expect(page.getByText('Clear the filter to rearrange')).toBeVisible()
  for (const handle of await page
    .getByRole('button', { name: /^Reorder / })
    .all()) {
    await expect(handle).toBeDisabled()
  }
})
