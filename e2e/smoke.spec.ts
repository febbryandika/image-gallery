import { expect, test } from '@playwright/test'

test('the gallery shell renders', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Photos' })).toBeVisible()
})
