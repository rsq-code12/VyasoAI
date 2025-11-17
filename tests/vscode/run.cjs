const path = require('path')
const { runTests } = require('@vscode/test-electron')
const { startMockDaemon } = require('../..//mock/mock-daemon.cjs')

async function main() {
  const daemon = startMockDaemon({ port: 8765, healthy: true })
  await daemon.start()
  try {
    await runTests({
      extensionDevelopmentPath: path.resolve(__dirname, '../../connectors/vscode'),
      extensionTestsPath: path.resolve(__dirname, '../../connectors/vscode/integration/suite/index.cjs'),
    })
  } finally {
    await daemon.close()
  }
}

main().catch(err => { console.error(err); process.exit(1) })