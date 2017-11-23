let Router = require('koa-router')
const fetch = require('node-fetch')
let router = new Router()

// index
router.get('/', (ctx, next) => {
  ctx.body = 'Hello RAP!'
})

// env
router.get('/env', (ctx, next) => {
  ctx.body = process.env.NODE_ENV
})

// fix preload
router.get('/check.node', (ctx, next) => {
  ctx.body = 'success'
})
router.get('/status.taobao', (ctx, next) => {
  ctx.body = 'success'
})
router.get('/test/test.status', (ctx, next) => {
  ctx.body = 'success'
})

// proxy
router.get('/proxy', async(ctx, next) => {
  let { target } = ctx.query
  console.log(`      <=> ${target}`)
  let json = await fetch(target).then(res => res.json())
  ctx.type = 'json'
  ctx.body = json
})

module.exports = router
