const path = require('path')
const fs = require('fs')

module.exports.run = async function() {
  const exists = fs.existsSync(path.resolve(__dirname, '../../dist/extension.js'))
  if (!exists) throw new Error('extension build missing')
}