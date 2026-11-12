import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for Vietjet Air Simulator.
 * Covers 3 core business workflows:
 * 1. Full booking flow to VietQR payment success
 * 2. Online seat change during check-in
 * 3. Admin flight delay update with realtime SSE notification
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4028',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 14'] },
    },
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:4028',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
