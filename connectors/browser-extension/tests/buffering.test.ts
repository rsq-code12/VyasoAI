import 'fake-indexeddb/auto'
import { putEvent, getAll, deleteEvent } from '../src/db.ts'

async function run() {
  const id = 'x'
  await putEvent({ id, body: { a: 1 }, attempts: 0, lastAttempt: Date.now() })
  const all1 = await getAll()
  if (all1.length !== 1) throw new Error('buffer insert failed')
  await deleteEvent(id)
  const all2 = await getAll()
  if (all2.length !== 0) throw new Error('buffer delete failed')
}

run().then(() => { console.log('ok') }).catch(e => { console.error(e); process.exit(1) })