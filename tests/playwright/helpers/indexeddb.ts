import { Page } from '@playwright/test'

export async function inspectIndexedDB(page: Page, dbName: string, storeName: string) {
  return await page.evaluate(async ({ dbName, storeName }) => {
    function openDB(): Promise<IDBDatabase> {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
    }
    const db = await openDB()
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req = store.getAll()
    const res: any[] = await new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result as any[]); req.onerror = () => reject(req.error) })
    await new Promise((resolve, reject) => { tx.oncomplete = () => resolve(undefined); tx.onerror = () => reject(tx.error) })
    return res
  }, { dbName, storeName })
}