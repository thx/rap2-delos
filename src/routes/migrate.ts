import router from './router'
import MigrateService from '../service/migrate'

/**
 * input: text
 */
router.post('/migrate/importFromRAP1', async (ctx) => {
  const { json, orgId } = ctx.request.body
  if (!ctx.session.id || !orgId || !json) {
    ctx.body = {
      isOk: false,
      errMsg: '参数错误'
    }
    return
  }
  try {
    const data = JSON.parse(json)
    await MigrateService.importRepoFromRAP1ProjectData(orgId, ctx.session.id, data)
  } catch (ex) {
    ctx.body = {
      isOk: false,
      errMsg: '解析JSON失败，错误详情：' + ex.message
    }
    return
  }
  ctx.body = {
    isOk: true
  }
})

// TODO
router.post('/__test__1', async (ctx) => {
  let { json, orgId, userId } = ctx.request.body
  json = json.replace(/[\n\x\'\\]/g, '')
  json = json.replace(/\\n/g, '')
  json = json.replace(/\\'/g, '')
  console.log(json)
  let data = JSON.parse(json)
  await MigrateService.importRepoFromRAP1ProjectData(orgId, userId, data)
  ctx.body = {
    isOk: true
  }
})