import * as Router from 'koa-router'
let router = new Router()

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
  let json = await fetch(target).then(res => res.json())
  ctx.type = 'json'
  ctx.body = json
})

export default router