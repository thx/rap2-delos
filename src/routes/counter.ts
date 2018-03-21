import router from './router'
import config from '../config'

router.get('/app/counter', async(ctx) => {
  let app: any = ctx.app
  ctx.body = {
    data: {
      version: config.version,
      users: Object.keys(app.counter.users).length,
      mock: app.counter.mock,
    },
  }
})