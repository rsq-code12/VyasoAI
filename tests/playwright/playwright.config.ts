import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './specs',
  timeout: 90000,
  use: { headless: false },
  projects: [
    { name: 'headful', use: { ...devices['Desktop Chrome'], headless: false } }
  ]
})