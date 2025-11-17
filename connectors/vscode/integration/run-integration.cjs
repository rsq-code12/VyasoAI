const path = require('path')
const { runTests } = require('@vscode/test-electron')
const http = require('http')

async function startMockDaemon(port, healthy = true) {
  const server = http.createServer((req, res) => {
    if (req.url === '/v1/health') {
      res.writeHead(healthy ? 200 : 500)
      res.end('ok')
      return
    }
    if (req.url === '/v1/events' && req.method === 'POST') {
      res.writeHead(202)
      res.end('accepted')
      return
    }
    res.writeHead(404); res.end()
  })
  await new Promise(r => server.listen(port, r))
  return server
}

async function main() {
  const server = await startMockDaemon(8765, true)
  try {
    await runTests({
      extensionDevelopmentPath: path.resolve(__dirname, '..'),
      extensionTestsPath: path.resolve(__dirname, 'suite/index.cjs'),
    })
  } finally {
    server.close()
  }
}

main().catch(err => { console.error(err); process.exit(1) })