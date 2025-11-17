import { startMockDaemon } from '../../../mock/mock-daemon.cjs'

export async function startDaemon(port = 8765, opts: any = {}) {
  const srv = startMockDaemon({ port, ...opts })
  await srv.start()
  return srv
}