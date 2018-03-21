import * as cluster from 'cluster'
import * as path from 'path'

let now = () => new Date().toISOString().replace(/T/, ' ').replace(/Z/, '')

cluster.setupMaster({
  exec: path.join(__dirname, 'scripts/worker.js'),
})

if (cluster.isMaster) {
  require('os').cpus().forEach(() => {
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
