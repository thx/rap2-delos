import { Interface,  QueryInclude, Room } from '../models'
import router from './router'
import Tree from './utils/tree'
import * as _ from 'underscore'
import { URL } from 'url'
import Helper from '../helpers/roomHelper'

const { mock } = require('mockjs')

router.get('/foreign/room', async (ctx, next) => {
  let { repositoryId, roomProjectId } = ctx.query

  if (!repositoryId && !roomProjectId) {
    ctx.body = {
      error: 'Need repositoryId or roomProjectId',
      data: {},
    }
    return next()
  }

  let interfaceQuery = { roomProjectId, repositoryId }
  !roomProjectId && delete interfaceQuery.roomProjectId
  !repositoryId && delete interfaceQuery.repositoryId

  let roomResult = await Room.findOne({
    where: interfaceQuery,
  })

  let ret = {}
  ctx.body = {
    error: undefined,
    data: ret,
  }

  if (!roomResult) {
    ctx.body.error = 'Not found'
    return next()
  }

  let interfaceResult = await Interface.findAll({
    where: { repositoryId: roomResult.repositoryId },
  })

  // let {name, description} = repoResult;
  Object.assign(ret, {
    roomProjectId: roomResult.roomProjectId,
    repositoryId: roomResult.repositoryId,
    hostname: roomResult.hostname,
    interfaces: interfaceResult.map(item => ({
      url: item.url,
      id: item.id,
    })),
  })

  return next()
})

router.get('/foreign/room/params', async (ctx, next) => {
  let {repositoryId, interfaceId, name} = ctx.query

  if (!name || ['普通', '边界'].indexOf(name) === -1) {
    name = '普通'
  }

  if (!ctx.session.empId) {
    ctx.body = {
      error: 'Need to login',
      data: {},
    }
  }

  if (!repositoryId) {
    ctx.body = {
      error: 'Need repositoryId',
      data: {},
    }
    return next()
  }

  let [roomResult, theInterface] = await Promise.all([
    Room.findOne({
      where: { repositoryId },
    }),
    Interface.findOne({
      where: { repositoryId, id: interfaceId },
      include: [
        QueryInclude.Properties,
      ],
    } as any),
  ])

  if (!theInterface) {
    ctx.body.error = 'Cannot find interface corresponding to ' + interfaceId
    return next()
  }

  let requestProperties = theInterface.properties.filter((item: any) => item.scope === 'request')
  let responseProperties = theInterface.properties.filter((item: any) => item.scope === 'response')

  let ret: any = {}
  ctx.body = {
    error: undefined,
    data: ret,
  }

  if (!roomResult || !requestProperties.length) {
    ctx.body.error = 'Not found'
    return next()
  }

  let { roomProjectId, hostname } = roomResult

  let cases = []
  let standard = mock(Tree.ArrayToTreeToTemplate(requestProperties))
  if (name === '普通') {
    cases.push(standard)
  } else if (name === '边界') {
    for (let prop of requestProperties) {
      let rules = Helper.generateRules(prop)
      if (!rules) {
        continue
      }
      // cases.push(standard)
      for (let rule of rules) {
        let obj = _.clone(standard)
        obj[prop.name] = rule
        Object.defineProperty(obj, '$type', {
          value: rule['$type'],
        })
        cases.push(obj)
      }
    }
  }

  let moduleName = theInterface.name + '-自动' + name + '验证'
  let path = new URL(theInterface.url, hostname).toString()

  ret.module = {
    moduleName: moduleName,
    projectId: roomProjectId,
  }
  ret.cases = cases.map(function (theCase) {
    let obj: any = {
      caseDesc: theInterface.name + (theCase['$type'] || ''),
      path: path + '?' + Helper.formatKV(theCase),
      keyValue: JSON.stringify(theCase),
      method: theInterface.method,
      mode: 1,                     // 固定参数
      moduleName: moduleName,      // 冗余参数
      // moduleId: moduleId,
      projectId: roomProjectId,
      rawData: '',                 // 天然为空
      setUp: '',                   // 天然为空
      tearDown: '',                // 天然为空
      userId: !ctx.session.empId ? '122033' : ctx.session.empId, // todo use empId
    }
    if (name === '普通') {
      obj.expectResult = 'true_json'
      obj.expectMessage = JSON.stringify(mock(Tree.ArrayToTreeToTemplate(responseProperties)))
    } else if (name === '边界') {
      obj.expectResult = 'false'
      obj.expectMessage = 'error'
    }
    return obj
  })

  return next()
})

module.exports = router
