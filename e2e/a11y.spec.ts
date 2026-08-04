import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/** Runs against the seeded demo account — `pnpm db:seed` must have been run. */

async function signIn(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill('demo@example.com')
  await page.getByLabel('Password').fill('demo1234')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Photos' })).toBeVisible()
}

/**
 * Only serious and critical block the build. Moderate and minor are reported in
 * the PR with a reason rather than silently swallowed by a looser filter.
 */
async function blockingViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target.join(' ')),
    }))
}

test.beforeEach(async ({ page }) => {
  // Scanning mid-animation samples a half-faded dialog and reports contrast
  // failures that do not exist once it settles. Reduced motion removes the
  // animation entirely, which makes the scan deterministic — and exercises the
  // motion-reduce path at the same time.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await signIn(page)
})

test('the gallery has no serious or critical violations', async ({ page }) => {
  expect(await blockingViolations(page)).toEqual([])
})

test('the upload page has no serious or critical violations', async ({
  page,
}) => {
  await page.goto('/upload')
  await expect(page.getByRole('heading', { name: 'Upload' })).toBeVisible()

  expect(await blockingViolations(page)).toEqual([])
})

test('an album page has no serious or critical violations', async ({
  page,
}) => {
  await page.getByRole('link', { name: /^Exteriors/ }).click()
  await expect(page.getByRole('heading', { name: 'Exteriors' })).toBeVisible()
  // The title comes from an async generateMetadata, so on a soft navigation it
  // lands after the heading does. Assert it arrives rather than scanning into
  // the gap and reporting a document-title violation that isn't real.
  await expect(page).toHaveTitle(/Exteriors/)

  expect(await blockingViolations(page)).toEqual([])
})

test('the open lightbox has no serious or critical violations', async ({
  page,
}) => {
  // A dialog's focus trap and labelling are exactly what a page-load-only scan
  // never reaches.
  await page
    .getByRole('button', { name: /^Open photo/ })
    .first()
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()

  expect(await blockingViolations(page)).toEqual([])
})

test('an open dropdown menu has no serious or critical violations', async ({
  page,
}) => {
  await page
    .getByRole('button', { name: /^Move / })
    .first()
    .click()
  await expect(page.getByRole('menu')).toBeVisible()

  expect(await blockingViolations(page)).toEqual([])
})
