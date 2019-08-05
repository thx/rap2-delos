// const debug = true
import * as Koa from 'koa'
import * as session from 'koa-generic-session'
import * as redisStore from 'koa-redis'
import * as logger from 'koa-logger'
import * as serve from 'koa-static'
import * as cors from 'kcors'
import * as bodyParser from 'koa-body'
import router from '../routes'
import config from '../config'
import { startTask } from '../service/task'

const app = new Koa()
let appAny: any = app
appAny.counter = { users: {}, mock: 0 }

app.keys = config.keys
app.use(session({
  store: redisStore(config.redis)
}))
if (process.env.NODE_ENV === 'development' && process.env.TEST_MODE !== 'true') app.use(logger())
app.use(async (ctx, next) => {

  ctx.set('Access-Control-Allow-Origin', '*')
  ctx.set('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS')
  ctx.set('Access-Control-Allow-Credentials', 'true')
  await next()
  if (ctx.path === '/favicon.ico') return
  ctx.session.views = (ctx.session.views || 0) + 1
  let app: any = ctx.app
  if (ctx.session.fullname) app.counter.users[ctx.session.fullname] = true
})
app.use(cors({
  credentials: true,
}))
app.use(async (ctx, next) => {
  await next()
  if (typeof ctx.body === 'object' && ctx.body.data !== undefined) {
    ctx.type = 'json'
    ctx.body = JSON.stringify(ctx.body, undefined, 2)
  }
})
app.use(async (ctx, next) => {
  await next()
  if (ctx.request.query.callback) {
    let body = typeof ctx.body === 'object' ? JSON.stringify(ctx.body, undefined, 2) : ctx.body
    ctx.body = ctx.request.query.callback + '(' + body + ')'
    ctx.type = 'application/x-javascript'
  }
})

app.use(serve('public'))
app.use(serve('test'))
app.use(bodyParser({ multipart: true }))

app.use(router.routes())

startTask()

export default app