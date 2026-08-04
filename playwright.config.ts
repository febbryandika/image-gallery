import { defineConfig, devices } from '@playwright/test'

/**
 * Overridable because `reuseExistingServer` will happily adopt whatever is
 * already listening on 3000 — including a different project's dev server — and
 * then the suite fails against an app it was never meant to test.
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  /**
   * Serial, on purpose. Every spec signs in as the same seeded demo account and
   * shares one database, and the happy path uploads and deletes a photo — run
   * in parallel they reorder and delete each other's fixtures.
   */
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // CI tests what actually ships. `pnpm dev` locally keeps the loop fast.
    command: process.env.CI ? 'pnpm start' : 'pnpm dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
