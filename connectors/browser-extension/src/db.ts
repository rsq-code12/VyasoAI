export type BufferedEvent = {
  id: string
  body: any
  attempts: number
  lastAttempt: number
  nextDue?: number
}

const DB_NAME = 'vyasoai-buffer'
const STORE = 'events'

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function putEvent(ev: BufferedEvent): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE, 'readwrite')
  tx.objectStore(STORE).put(ev)
  await txComplete(tx)
}

export async function getAll(): Promise<BufferedEvent[]> {
  const db = await openDB()
  const tx = db.transaction(STORE, 'readonly')
  const store = tx.objectStore(STORE)
  const req = store.getAll()
  const res = await reqPromise<any[]>(req)
  await txComplete(tx)
  return res.map((it: any) => ({
    id: it.id,
    body: it.body,
    attempts: typeof it.attempts === 'number' ? it.attempts : 0,
    lastAttempt: typeof it.lastAttempt === 'number' ? it.lastAttempt : 0,
    nextDue: typeof it.nextDue === 'number' ? it.nextDue : undefined
  }))
}

export async function deleteEvent(id: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE, 'readwrite')
  tx.objectStore(STORE).delete(id)
  await txComplete(tx)
}

export async function updateEvent(ev: BufferedEvent): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE, 'readwrite')
  tx.objectStore(STORE).put(ev)
  await txComplete(tx)
}

function txComplete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

function reqPromise<T>(req: IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as T)
    req.onerror = () => reject(req.error)
  })
}