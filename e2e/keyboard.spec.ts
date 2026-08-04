import { expect, test, type Page } from '@playwright/test'

/**
 * The half axe cannot check: that every flow can actually be driven without a
 * mouse. Nothing in here uses .click() — only keyboard input.
 *
 * Runs against the seeded demo account — `pnpm db:seed` must have been run.
 */

async function signInWithKeyboard(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').focus()
  await page.keyboard.type('demo@example.com')
  await page.keyboard.press('Tab')
  await page.keyboard.type('demo1234')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Photos' })).toBeVisible()
}

/** What the browser would announce for whatever currently has focus. */
function focusedLabel(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement
    if (!el) return ''
    return (
      el.getAttribute('aria-label') ??
      el.textContent?.trim().slice(0, 40) ??
      el.tagName
    )
  })
}

/** Tab until `match` has focus, so the assertion is "reachable", not "exists". */
async function tabTo(page: Page, match: RegExp, limit = 60): Promise<string> {
  for (let i = 0; i < limit; i += 1) {
    await page.keyboard.press('Tab')
    const label = await focusedLabel(page)
    if (match.test(label)) return label
  }
  throw new Error(`Never reached ${match} after ${limit} tabs`)
}

test.beforeEach(async ({ page }) => {
  await signInWithKeyboard(page)
})

test('the login form submits on Enter, with no mouse', async ({ page }) => {
  // Proven by beforeEach getting here at all.
  await expect(page.getByRole('heading', { name: 'Photos' })).toBeVisible()
})

test('the skip link is the first stop on a fresh load, and is visible', async ({
  page,
}) => {
  // A fresh load, not the post-login soft navigation: after a route change the
  // App Router puts focus on the new page's content, so Tab continues from
  // there rather than from the top of the document.
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Photos' })).toBeVisible()

  await page.keyboard.press('Tab')

  expect(await focusedLabel(page)).toBe('Skip to content')
  // sr-only until focused, so this proves the focus styles actually reveal it.
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeVisible()
})

test('every control hidden until hover is still reachable by Tab', async ({
  page,
}) => {
  // These sit in opacity-0 clusters that only appear on hover or focus-within.
  for (const target of [/^Actions for /, /^Move /, /^Delete /]) {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Photos' })).toBeVisible()
    await tabTo(page, target)

    // Reachable is not enough — a sighted keyboard user has to see it. Opacity
    // is often set on a wrapping cluster, so multiply it up the tree, and poll
    // so the fade-in isn't sampled halfway.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            let el: Element | null = document.activeElement
            let effective = 1
            while (el && el !== document.body) {
              effective *= Number(getComputedStyle(el).opacity)
              el = el.parentElement
            }
            return effective
          }),
        { message: `${target} focused but stayed invisible` },
      )
      .toBeGreaterThan(0.99)
  }
})

test('the lightbox traps focus, closes on Escape, and restores focus', async ({
  page,
}) => {
  const cardLabel = await tabTo(page, /^Open photo/)
  await page.keyboard.press('Enter')

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  // Focus is inside the dialog...
  expect(
    await page.evaluate(() =>
      document
        .querySelector('[role="dialog"]')
        ?.contains(document.activeElement),
    ),
  ).toBe(true)

  // ...and stays there through a full cycle of tabbing.
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press('Tab')
    expect(
      await page.evaluate(() =>
        document
          .querySelector('[role="dialog"]')
          ?.contains(document.activeElement),
      ),
    ).toBe(true)
  }

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  // Focus returns to the card that opened it (SPEC §5.2).
  expect(await focusedLabel(page)).toBe(cardLabel)
})

test('the lightbox moves between photos with the arrow keys', async ({
  page,
}) => {
  await tabTo(page, /^Open photo/)
  await page.keyboard.press('Enter')

  const counter = page.getByRole('dialog').locator('p[aria-live="polite"]')
  await expect(counter).toContainText('1 of')

  await page.keyboard.press('ArrowRight')
  await expect(counter).toContainText('2 of')

  await page.keyboard.press('ArrowLeft')
  await expect(counter).toContainText('1 of')
})

test('an album can be renamed and cancelled from the keyboard', async ({
  page,
}) => {
  await tabTo(page, /^Actions for Exteriors/)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('menu')).toBeVisible()

  // Opening the menu already highlights the first item, so Enter takes it.
  await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeFocused()
  await page.keyboard.press('Enter')

  // Rename swaps the row for an input, which must take focus itself.
  const input = page.getByLabel('Rename Exteriors')
  await expect(input).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(input).toBeHidden()
  await expect(page.getByRole('link', { name: /^Exteriors/ })).toBeVisible()
})

test('the delete dialog is keyboard-operable and cancels cleanly', async ({
  page,
}) => {
  const trigger = await tabTo(page, /^Delete /)
  await page.keyboard.press('Enter')

  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible()
  expect(
    await page.evaluate(() =>
      document
        .querySelector('[role="alertdialog"]')
        ?.contains(document.activeElement),
    ),
  ).toBe(true)

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  expect(await focusedLabel(page)).toBe(trigger)
})

test('the search field submits with Enter alone', async ({ page }) => {
  await page.getByLabel('Search alt text').focus()
  await page.keyboard.type('cafe')
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(/[?&]q=cafe/)
})
