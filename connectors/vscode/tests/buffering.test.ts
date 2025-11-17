import * as fs from 'fs'
import * as path from 'path'
import { putEvent, getAll, deleteEvent } from '../src/buffer.ts'

async function run() {
  const dir = path.join(process.cwd(), 'tmp-vscode-buffer-test')
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
  const ev = { id: 'a', body: { a: 1 }, attempts: 0, lastAttempt: Date.now(), nextDue: Date.now() }
  await putEvent(dir, ev)
  const arr = await getAll(dir)
  if (arr.length !== 1) throw new Error('put/get failed')
  await deleteEvent(dir, 'a')
  const arr2 = await getAll(dir)
  if (arr2.length !== 0) throw new Error('delete failed')
  console.log('ok')
}

run().then(() => { console.log('ok') }).catch(e => { console.error(e); process.exit(1) })