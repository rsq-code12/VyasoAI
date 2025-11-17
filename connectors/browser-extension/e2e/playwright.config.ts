import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './',
  timeout: 60000,
  use: {
    headless: true
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ]
})