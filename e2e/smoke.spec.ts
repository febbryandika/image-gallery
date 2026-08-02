import { expect, test } from '@playwright/test'

test('the shell renders and the app routes are guarded', async ({ page }) => {
  // Signed out, every (app) route redirects to /login (SPEC §6).
  await page.goto('/')

  await expect(page).toHaveURL('/login')
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
})
