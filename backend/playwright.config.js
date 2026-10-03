import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    // Launch Vite directly so Playwright owns the server process and Windows
    // does not leave an intermediate npm.cmd child alive after the test run.
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173',
    cwd: '../frontend',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
})
