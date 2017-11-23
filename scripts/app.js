const debug = true
const Koa = require('koa')
const session = require('koa-session')
const logger = require('koa-logger')
const serve = require('koa-static')
const body = require('koa-body')
const cors = require('kcors')
const router = require('../src/routes')
const config = require('../config')

const app = new Koa()
app.counter = { users: {}, mock: 0 }

app.keys = config.keys
app.use(session(config.session, app))
if (debug) app.use(logger())
app.use(async(ctx, next) => {
  await next()
  if (ctx.path === '/favicon.ico') return
  ctx.session.views = (ctx.session.views || 0) + 1
  if (ctx.session.fullname) ctx.app.counter.users[ctx.session.fullname] = true
})
app.use(cors({
  credentials: true
}))
app.use(async(ctx, next) => {
  await next()
  if (typeof ctx.body === 'object' && ctx.body.data !== undefined) {
    ctx.type = 'json'
    // ctx.body.path = ctx.path
    ctx.body = JSON.stringify(ctx.body, null, 2)
  }
})
app.use(async(ctx, next) => {
  await next()
  if (ctx.request.query.callback) {
    let body = typeof ctx.body === 'object' ? JSON.stringify(ctx.body, null, 2) : ctx.body
    ctx.body = ctx.request.query.callback + '(' + body + ')'
    ctx.type = 'application/x-javascript'
  }
})

app.use(serve('public'))
app.use(serve('test'))
app.use(body())
app.use(router.routes())

module.exports = app
