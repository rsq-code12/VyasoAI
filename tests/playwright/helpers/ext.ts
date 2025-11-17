import { chromium, BrowserContext, Page } from '@playwright/test'
import * as path from 'path'
import * as os from 'os'
import { promises as fs } from 'fs'

export async function loadExtension(extRelPath: string): Promise<{ context: BrowserContext, page: Page }> {
  const extPath = path.resolve(process.cwd(), extRelPath)
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pw-ext-'))
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    args: [
      `--disable-extensions-except=${extPath}`,
      `--load-extension=${extPath}`
    ]
  })
  const page = await context.newPage()
  return { context, page }
}