import router from './router'
import { COMMON_ERROR_RES } from './utils/const'
import PostmanService from '../service/postman'

router.get('/postman/export', async (ctx) => {
  const repoId = +ctx.query.id
  if (!(repoId > 0)) {
    ctx.data = COMMON_ERROR_RES.ERROR_PARAMS
  }
  ctx.body = await PostmanService.export(repoId)
})