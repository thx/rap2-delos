import router from './router'
import { COMMON_ERROR_RES } from './utils/const'
import PostmanService from '../service/postman'
import { AccessUtils, ACCESS_TYPE } from './utils/access'

router.get('/postman/export', async (ctx) => {
  const repoId = +ctx.query.id
  if (!await AccessUtils.canUserAccess(ACCESS_TYPE.REPOSITORY, ctx.session.id, repoId)) {
    ctx.body = COMMON_ERROR_RES.ACCESS_DENY
    return
  }
  if (!(repoId > 0)) {
    ctx.data = COMMON_ERROR_RES.ERROR_PARAMS
  }
  ctx.body = await PostmanService.export(repoId)
})