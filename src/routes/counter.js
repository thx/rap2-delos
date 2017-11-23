const router = require('./router')
const config = require('../../config')

router.get('/app/counter', async(ctx, next) => {
  ctx.body = {
    data: {
      version: config.version,
      users: Object.keys(ctx.app.counter.users).length,
      mock: ctx.app.counter.mock
    }
  }
})

module.exports = router
