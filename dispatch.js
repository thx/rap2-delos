// process.env.NODE_ENV = 'production'

// http://gitlab.alibaba-inc.com/thx/rap2-dolores/commit/2fd70fdcaa9d179e9cf95e530e37f31f8488f432
// https://nodejs.org/api/cluster.html
// https://github.com/node-modules/graceful/blob/master/example/express_with_cluster/dispatch.js
// http://gitlab.alibaba-inc.com/mm/fb/blob/master/dispatch.js

let cluster = require('cluster')
let path = require('path')
let now = () => new Date().toISOString().replace(/T/, ' ').replace(/Z/, '')

cluster.setupMaster({
  exec: path.join(__dirname, 'scripts/worker.js')
})

if (cluster.isMaster) {
  require('os').cpus().forEach((cpu, index) => {
    cluster.fork()
  })
  cluster.on('listening', (worker, address) => {
    console.error(`[${now()}] master#${process.pid} worker#${worker.process.pid} is now connected to ${address.address}:${address.port}.`)
  })
  cluster.on('disconnect', (worker) => {
    console.error(`[${now()}] master#${process.pid} worker#${worker.process.pid} has disconnected.`)
  })
  cluster.on('exit', (worker, code, signal) => {
    console.error(`[${now()}] master#${process.pid} worker#${worker.process.pid} died (${signal || code}). restarting...`)
    cluster.fork()
  })
}
