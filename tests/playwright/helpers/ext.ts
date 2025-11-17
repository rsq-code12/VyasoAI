import { chromium, BrowserContext, Page } from '@playwright/test'
import * as path from 'path'
import * as os from 'os'
import { promises as fs } from 'fs'

export async function loadExtension(extRelPath: string): Promise<{ context: BrowserContext, page: Page }> {
  const extPath = path.resolve(process.cwd(), extRelPath)
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pw-ext-'))
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extPath}`,
      `--load-extension=${extPath}`,
      '--disable-web-security',
      '--allow-running-insecure-content',
      '--remote-allow-origins=*'
    ]
  })
  const page = await context.newPage()
  return { context, page }
}

export async function callExtension<T>(context: BrowserContext, type: string, payload?: any): Promise<T> {
  let worker = context.serviceWorkers()[0]
  const started = Date.now()
  while (!worker) {
    await new Promise(r => setTimeout(r, 200))
    worker = context.serviceWorkers()[0]
    if (Date.now() - started > 10000) throw new Error('extension worker not found')
  }
  return await worker.evaluate(({ type, payload }) => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, payload }, (resp) => { resolve(resp as any) })
    })
  }, { type, payload })
}