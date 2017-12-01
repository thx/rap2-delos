const start = () => {
  let execSync = require('child_process').execSync
  let app = require('./app')
  const config = require('../config')
  let port = config.serve.port
  let url = `http://localhost:${port}` // /api.html
  let open = false
  console.log('----------------------------------------')
  app.listen(port, () => {
    console.log(`rap2-dolores is running as ${url}`)
    if (!open) return
    try {
      execSync(`osascript openChrome.applescript ${url}`, { cwd: __dirname, stdio: 'ignore' })
    } catch (e) {
      execSync(`open ${url}`)
    }
  })
}

start()
