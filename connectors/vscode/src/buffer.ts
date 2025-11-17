import * as fs from 'fs'
import * as path from 'path'

export type BufferedEvent = {
  id: string
  body: any
  attempts: number
  lastAttempt: number
  nextDue?: number
}

function filePath(dir: string): string { return path.join(dir, 'buffer.json') }

function readAll(dir: string): BufferedEvent[] {
  const file = filePath(dir)
  if (!fs.existsSync(file)) return []
  try {
    const arr: any[] = JSON.parse(fs.readFileSync(file, 'utf8'))
    return arr.map((it: any) => ({
      id: it.id,
      body: it.body,
      attempts: typeof it.attempts === 'number' ? it.attempts : 0,
      lastAttempt: typeof it.lastAttempt === 'number' ? it.lastAttempt : 0,
      nextDue: typeof it.nextDue === 'number' ? it.nextDue : undefined
    }))
  } catch { return [] }
}

function writeAll(dir: string, arr: BufferedEvent[]) {
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filePath(dir), JSON.stringify(arr))
}

export async function putEvent(dir: string, ev: BufferedEvent) {
  const arr = readAll(dir)
  const idx = arr.findIndex(x => x.id === ev.id)
  if (idx >= 0) arr[idx] = ev; else arr.push(ev)
  writeAll(dir, arr)
}

export async function getAll(dir: string): Promise<BufferedEvent[]> { return readAll(dir) }

export async function updateEvent(dir: string, ev: BufferedEvent) { return putEvent(dir, ev) }

export async function deleteEvent(dir: string, id: string) {
  const arr = readAll(dir).filter(x => x.id !== id)
  writeAll(dir, arr)
}