import * as Router from 'koa-router'
import { DefaultState, DefaultContext } from "koa"
import config from '../config'

let router = new Router<DefaultState, DefaultContext>({prefix: config.serve.path})

// index
router.get('/', (ctx) => {
  ctx.body = 'Hello RAP!'
})

// env
router.get('/env', (ctx) => {
  ctx.body = process.env.NODE_ENV
})

// fix preload
router.get('/check.node', (ctx) => {
  ctx.body = 'success'
})
router.get('/status.taobao', (ctx) => {
  ctx.body = 'success'
})
router.get('/test/test.status', (ctx) => {
  ctx.body = 'success'
})

// proxy
router.get('/proxy', async(ctx) => {
  let { target } = ctx.query
  let json = await fetch(target as string).then(res => res.json())
  ctx.type = 'json'
  ctx.body = json
})

export default router