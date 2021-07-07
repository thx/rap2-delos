// TODO 2.1 大数据测试，含有大量模块、接口、属性的仓库
import router from './router'
import * as _ from 'underscore'
import Pagination from './utils/pagination'
import { User, Organization, Repository, Module, Interface, Property, QueryInclude, Logger, DefaultVal } from '../models'
import Tree from './utils/tree'
import { AccessUtils, ACCESS_TYPE } from './utils/access'
import * as Consts from './utils/const'
import RedisService, { CACHE_KEY } from '../service/redis'
import RepositoryService from '../service/repository'
import MigrateService from '../service/migrate'
import OrganizationService from '../service/organization'
import { Op } from 'sequelize'
import { isLoggedIn } from './base'

import { initRepository, initModule } from './utils/helper'
import nanoid = require('nanoid')
import { LOG_SEPERATOR, LOG_SUB_SEPERATOR } from '../models/bo/historyLog'
import { ENTITY_TYPE } from './utils/const'
import { IPager } from '../types'
import * as JSON5 from 'json5'

router.get('/app/get', async (ctx, next) => {
  let data: any = {}
  let query = ctx.query
  let hooks: any = {
    repository: Repository,
    module: Module,
    interface: Interface,
    property: Property,
    user: User,
  }
  for (let name in hooks) {
    if (!query[name]) continue
    data[name] = await hooks[name].findByPk(query[name])
  }
  ctx.body = {
    data: Object.assign({}, ctx.body && ctx.body.data, data),
  }

  return next()
})

router.get('/repository/count', async (ctx) => {
  ctx.body = {
    data: await Repository.count(),
  }
})

router.get('/repository/list', async (ctx) => {
  let where = {}
  let { name, user, organization } = ctx.query

  if (+organization > 0) {
    const access = await AccessUtils.canUserAccess(ACCESS_TYPE.ORGANIZATION_GET, ctx.session.id, +organization)

    if (access === false) {
      ctx.body = {
        isOk: false,
        errMsg: Consts.COMMON_MSGS.ACCESS_DENY
      }
      return
    }
  }

  // tslint:disable-next-line:no-null-keyword
  if (user) Object.assign(where, { ownerId: user, organizationId: null })
  if (organization) Object.assign(where, { organizationId: organization })
  if (name) {
    Object.assign(where, {
      [Op.or]: [
        { name: { [Op.like]: `%${name}%` } },
        { id: name } // name => id
      ]
    })
  }
  let total = await Repository.count({
    where,
    include: [
      QueryInclude.Creator,
      QueryInclude.Owner,
      QueryInclude.Locker
    ]
  })
  let limit = Math.min(+ctx.query.limit ?? 10, 100)
  let pagination = new Pagination(total, ctx.query.cursor || 1, limit)
  let repositories = await Repository.findAll({
    where,
    attributes: { exclude: [] },
    include: [
      QueryInclude.Creator,
      QueryInclude.Owner,
      QueryInclude.Locker,
      QueryInclude.Members,
      QueryInclude.Organization,
      QueryInclude.Collaborators,
    ],
    offset: pagination.start,
    limit: pagination.limit,
    order: [['updatedAt', 'DESC']]
  })
  let repoData = await Promise.all(repositories.map(async (repo) => {
    const canUserEdit = await AccessUtils.canUserAccess(
      ACCESS_TYPE.REPOSITORY_SET,
      ctx.session.id,
      repo.id,
    )
    return {
      ...repo.toJSON(),
      canUserEdit
    }
  }))
  ctx.body = {
    isOk: true,
    data: repoData,
    pagination: pagination,
  }
})

router.get('/repository/owned', isLoggedIn, async (ctx) => {
  let where = {}
  let { name } = ctx.query
  if (name) {
    Object.assign(where, {
      [Op.or]: [
        { name: { [Op.like]: `%${name}%` } },
        { id: name } // name => id
      ]
    })
  }

  let auth: User = await User.findByPk(ctx.query.user || ctx.session.id)

  let repositories = await auth.$get('ownedRepositories', {
    where,
    include: [
      QueryInclude.Creator,
      QueryInclude.Owner,
      QueryInclude.Locker,
      QueryInclude.Members,
      QueryInclude.Organization,
      QueryInclude.Collaborators,
    ],
    order: [['updatedAt', 'DESC']]
  })
  let repoData = repositories.map(repo => {
    return {
      ...repo.toJSON(),
      canUserEdit: true
    }
  })
  ctx.body = {
    data: repoData,
    pagination: undefined,
  }
})

router.get('/repository/joined', isLoggedIn, async (ctx) => {
  let where: any = {}
  let { name } = ctx.query
  if (name) {
    Object.assign(where, {
      [Op.or]: [
        { name: { [Op.like]: `%${name}%` } },
        { id: name } // name => id
      ]
    })
  }

  let auth = await User.findByPk(ctx.query.user || ctx.session.id)
  let repositories = await auth.$get('joinedRepositories', {
    where,
    attributes: { exclude: [] },
    include: [
      QueryInclude.Creator,
      QueryInclude.Owner,
      QueryInclude.Locker,
      QueryInclude.Members,
      QueryInclude.Organization,
      QueryInclude.Collaborators,
    ],
    order: [['updatedAt', 'DESC']]
  })
  let repoData = repositories.map(repo => {
    return {
      ...repo.toJSON(),
      canUserEdit: true,
    }
  })
  ctx.body = {
    data: repoData,
    pagination: undefined
  }
})

router.get('/repository/get', async (ctx) => {
  const access = await AccessUtils.canUserAccess(
    ACCESS_TYPE.REPOSITORY_GET,
    ctx.session.id,
    +ctx.query.id,
    ctx.query.token as string
  )
  if (access === false) {
    ctx.body = {
      isOk: false,
      errMsg: Consts.COMMON_MSGS.ACCESS_DENY
    }
    return
  }
  const excludeProperty = ctx.query.excludeProperty || false
  const canUserEdit = await AccessUtils.canUserAccess(
    ACCESS_TYPE.REPOSITORY_SET,
    ctx.session.id,
    +ctx.query.id,
    ctx.query.token as string,
  )
  let repository: Partial<Repository> & {
    canUserEdit: boolean
  }
  // 分开查询减少查询时间
  let [repositoryOmitModules, repositoryModules] = await Promise.all([
    Repository.findByPk(+ctx.query.id, {
      attributes: { exclude: [] },
      include: [
        QueryInclude.Creator,
        QueryInclude.Owner,
        QueryInclude.Locker,
        QueryInclude.Members,
        QueryInclude.Organization,
        QueryInclude.Collaborators,
      ],
    }),
    Repository.findByPk(+ctx.query.id, {
      attributes: { exclude: [] },
      include: [
        excludeProperty
          ? QueryInclude.RepositoryHierarchyExcludeProperty
          : QueryInclude.RepositoryHierarchy,
      ],
      order: [
        [{ model: Module, as: 'modules' }, 'priority', 'asc'],
        [
          { model: Module, as: 'modules' },
          { model: Interface, as: 'interfaces' },
          'priority',
          'asc',
        ],
      ],
    }),
  ])
  repository = {
    ...repositoryOmitModules.toJSON(),
    ...repositoryModules.toJSON(),
    canUserEdit
  }

  ctx.body = {
    data: repository,
  }
})

router.post('/repository/create', isLoggedIn, async (ctx, next) => {
  let creatorId = ctx.session.id
  let body = Object.assign({}, ctx.request.body, {
    creatorId,
    ownerId: creatorId,
    token: nanoid(32)
  })
  let created = await Repository.create(body)
  if (body.memberIds) {
    let members = await User.findAll({ where: { id: body.memberIds } })
    await created.$set('members', members)
  }
  if (body.collaboratorIds) {
    let collaborators = await Repository.findAll({ where: { id: body.collaboratorIds } })
    await created.$set('collaborators', collaborators)
  }
  await initRepository(created)
  ctx.body = {
    data: await Repository.findByPk(created.id, {
      attributes: { exclude: [] },
      include: [
        QueryInclude.Creator,
        QueryInclude.Owner,
        QueryInclude.Locker,
        QueryInclude.Members,
        QueryInclude.Organization,
        QueryInclude.RepositoryHierarchy,
        QueryInclude.Collaborators,
      ],
    } as any),
  }
  return next()
}, async (ctx) => {
  await Logger.create({
    userId: ctx.session.id,
    type: 'create',
    repositoryId: ctx.body.data.id,
  })
})

router.post('/repository/update', isLoggedIn, async (ctx, next) => {
  const body = Object.assign({}, ctx.request.body)
  if (!await AccessUtils.canUserAccess(ACCESS_TYPE.REPOSITORY_SET, ctx.session.id, body.id)) {
    ctx.body = Consts.COMMON_ERROR_RES.ACCESS_DENY
    return
  }
  let repo = await Repository.findByPk(body.id)

  // 更改团队需要校验是否有当前团队和目标团队的权限
  if (body.organizationId != repo.organizationId) {

    if (body.organizationId && !(await OrganizationService.canUserAccessOrganization(ctx.session.id, body.organizationId))) {
      ctx.body = '没有当前团队的权限'
      return
    }

    if (repo.organizationId && !(await OrganizationService.canUserAccessOrganization(ctx.session.id, repo.organizationId))) {
      ctx.body = '没有目标团队的权限'
      return
    }
  }

  delete body.creatorId

  let result = await Repository.update(body, { where: { id: body.id } })
  if (body.memberIds) {
    let reloaded = await Repository.findByPk(body.id, {
      include: [{
        model: User,
        as: 'members',
      }],
    })
    let members = await User.findAll({
      where: {
        id: {
          [Op.in]: body.memberIds,
        },
      },
    })
    ctx.prevAssociations = reloaded.members
    reloaded.$set('members', members)
    await reloaded.save()
    ctx.nextAssociations = reloaded.members
  }
  if (body.collaboratorIds) {
    let reloaded = await Repository.findByPk(body.id)
    let collaborators = await Repository.findAll({
      where: {
        id: {
          [Op.in]: body.collaboratorIds,
        },
      },
    })
    reloaded.$set('collaborators', collaborators)
    await reloaded.save()
  }
  ctx.body = {
    data: result[0],
  }
  return next()
}, async (ctx) => {
  let { id } = ctx.request.body
  await Logger.create({
    userId: ctx.session.id,
    type: 'update',
    repositoryId: id,
  })
  // 加入 & 退出
  if (!ctx.prevAssociations || !ctx.nextAssociations) return
  let prevIds = ctx.prevAssociations.map((item: any) => item.id)
  let nextIds = ctx.nextAssociations.map((item: any) => item.id)
  let joined = _.difference(nextIds, prevIds)
  let exited = _.difference(prevIds, nextIds)
  let creatorId = ctx.session.id
  for (let userId of joined) {
    await Logger.create({ creatorId, userId, type: 'join', repositoryId: id })
  }
  for (let userId of exited) {
    await Logger.create({ creatorId, userId, type: 'exit', repositoryId: id })
  }
})

router.post('/repository/transfer', isLoggedIn, async (ctx) => {
  let { id, ownerId, organizationId } = ctx.request.body
  if (!await AccessUtils.canUserAccess(ACCESS_TYPE.ORGANIZATION_SET, ctx.session.id, organizationId)) {
    ctx.body = Consts.COMMON_ERROR_RES.ACCESS_DENY
    return
  }
  let body: any = {}
  if (ownerId) body.ownerId = ownerId // 转移给其他用户
  if (organizationId) {
    body.organizationId = organizationId // 转移给其他团队，同时转移给该团队拥有者
    body.ownerId = (await Organization.findByPk(organizationId)).ownerId
  }
  let result = await Repository.update(body, { where: { id } })
  ctx.body = {
    data: result[0],
  }
})

router.get('/repository/remove', isLoggedIn, async (ctx, next) => {
  const id = +ctx.query.id
  if (!await AccessUtils.canUserAccess(ACCESS_TYPE.REPOSITORY_SET, ctx.session.id, id)) {
    ctx.body = Consts.COMMON_ERROR_RES.ACCESS_DENY
    return
  }
  let result = await Repository.destroy({ where: { id } })
  await Module.destroy({ where: { repositoryId: id } })
  await Interface.destroy({ where: { repositoryId: id } })
  await Property.destroy({ where: { repositoryId: id } })
  ctx.body = {
    data: result,
  }
  return next()
}, async (ctx) => {
  if (ctx.body.data === 0) return
  let { id } = ctx.query
  await Logger.create({
    userId: ctx.session.id,
    type: 'delete',
    repositoryId: id,
  })
})

// TOEO 锁定/解锁仓库 待测试
router.post('/repository/lock', isLoggedIn, async (ctx) => {
  const id = +ctx.request.body.id
  if (!await AccessUtils.canUserAccess(ACCESS_TYPE.REPOSITORY_SET, ctx.session.id, id)) {
    ctx.body = Consts.COMMON_ERROR_RES.ACCESS_DENY
    return
  }
  let user = ctx.session.id
  if (!user) {
    ctx.body = { data: 0 }
    return
  }
  let result = await Repository.update({ lockerId: user }, {
    where: { id },
  })
  ctx.body = { data: result[0] }
})

router.post('/repository/unlock', async (ctx) => {
  if (!ctx.session.id) {
    ctx.body = { data: 0 }
    return
  }
  let { id } = ctx.request.body
  // tslint:disable-next-line:no-null-keyword
  let result = await Repository.update({ lockerId: null }, {
    where: { id },
  })
  ctx.body = { data: result[0] }
})

// 模块
router.get('/module/count', async (ctx) => {
  ctx.body = {
    data: await Module.count(),
  }
})

router.get('/module/list', async (ctx) => {
  let where: any = {}
  let { repositoryId, name } = ctx.query
  if (repositoryId) where.repositoryId = repositoryId
  if (name) where.name = { [Op.like]: `%${name}%` }
  ctx.body = {
    data: await Module.findAll({
      attributes: { exclude: [] },
      where,
    }),
  }
})

router.get('/module/get', async (ctx) => {
  ctx.body = {
    data: await Module.findByPk(+ctx.query.id, {
      attributes: { exclude: [] }
    })
  }
})

router.post('/module/create', isLoggedIn, async (ctx, next) => {
  let creatorId = ctx.session.id
  let body = Object.assign(ctx.request.body, { creatorId })
  body.priority = Date.now()
  let created = await Module.create(body)
  await initModule(created)
  ctx.body = {
    data: await Module.findByPk(created.id)
  }
  return next()
}, async (ctx) => {
  let mod = ctx.body.data
  await Logger.create({
    userId: ctx.session.id,
    type: 'create',
    repositoryId: mod.repositoryId,
    moduleId: mod.id,
  })
})

router.post('/module/update', isLoggedIn, async (ctx, next) => {
  const { id, name, description } = ctx.request.body
  if (!await AccessUtils.canUserAccess(ACCESS_TYPE.MODULE_SET, ctx.session.id, +id)) {
    ctx.body = Consts.COMMON_ERROR_RES.ACCESS_DENY
    return
  }
  let mod = await Module.findByPk(id)
  await mod.update({ name, description })
  ctx.request.body.repositoryId = mod.repositoryId
  ctx.body = {
    data: {
      id,
      name,
      description
    },
  }
  return next()
}, async (ctx) => {
  if (ctx.body.data === 0) return
  let mod = ctx.request.body
  await Logger.create({
    userId: ctx.session.id,
    type: 'update',
    repositoryId: mod.repositoryId,
    moduleId: mod.id,
  })
})

router.post('/module/move', isLoggedIn, async ctx => {
  const { modId, op } = ctx.request.body
  const repositoryId = ctx.request.body.repositoryId

  if (!(await RepositoryService.canUserMoveModule(ctx.session.id, modId, repositoryId))) {
    ctx.body = Consts.COMMON_ERROR_RES.ACCESS_DENY
    return
  }

  await RepositoryService.moveModule(op, modId, repositoryId)

  ctx.body = {
    data: {
      isOk: true,
    },
  }
})

router.get('/module/remove', isLoggedIn, async (ctx, next) => {
  let { id } = ctx.query
  if (!await AccessUtils.canUserAccess(ACCESS_TYPE.MODULE_SET, ctx.session.id, +id)) {
    ctx.body = Consts.COMMON_ERROR_RES.ACCESS_DENY
    return
  }
  let result = await Module.destroy({ where: { id } })
  await Interface.destroy({ where: { moduleId: id } })
  await Property.destroy({ where: { moduleId: id } })
  ctx.body = {
    data: result,
  }
  return next()
}, async (ctx) => {
  if (ctx.body.data === 0) return
  const id = +ctx.query.id
  let mod = await Module.findByPk(id, { paranoid: false })
  await Logger.create({
    userId: ctx.session.id,
    type: 'delete',
    repositoryId: mod.repositoryId,
    moduleId: mod.id,
  })
})

router.post('/module/sort', isLoggedIn, async (ctx) => {
  let { ids } = ctx.request.body
  let counter = 1
  for (let index = 0; index < ids.length; index++) {
    await Module.update({ priority: counter++ }, {
      where: { id: ids[index] }
    })
  }
  if (ids && ids.length) {
    const mod = await Module.findByPk(ids[0])
    await RedisService.delCache(CACHE_KEY.REPOSITORY_GET, mod.repositoryId)
  }
  ctx.body = {
    data: ids.length,
  }
})

router.get('/interface/count', async (ctx) => {
  ctx.body = {
    data: await Interface.count(),
  }
})

router.get('/interface/list', async (ctx) => {
  let where: any = {}
  let { repositoryId, moduleId, name } = ctx.query
  if (!await AccessUtils.canUserAccess(ACCESS_TYPE.REPOSITORY_GET, ctx.session.id, +repositoryId)) {
    ctx.body = Consts.COMMON_ERROR_RES.ACCESS_DENY
    return
  }
  if (repositoryId) where.repositoryId = repositoryId
  if (moduleId) where.moduleId = moduleId
  if (name) where.name = { [Op.like]: `%${name}%` }
  ctx.body = {
    data: await Interface.findAll({
      attributes: { exclude: [] },
      where,
    }),
  }
})

router.get('/repository/defaultVal/get/:id', async (ctx) => {
  const repositoryId: number = +ctx.params.id
  ctx.body = {
    data: await DefaultVal.findAll({ where: { repositoryId } })
  }
})

router.post('/repository/defaultVal/update/:id', async (ctx) => {
  const repositoryId: number = +ctx.params.id
  if (!await AccessUtils.canUserAccess(ACCESS_TYPE.REPOSITORY_SET, ctx.session.id, repositoryId)) {
    ctx.body = Consts.COMMON_ERROR_RES.ACCESS_DENY
    return
  }
  const list = ctx.request.body.list.map(x => { const { id, ...y } = x; return y })
  if (!(repositoryId > 0) || !list) {
    ctx.body = Consts.COMMON_ERROR_RES.ERROR_PARAMS
    return
  }
  await DefaultVal.destroy({
    where: { repositoryId }
  })
  for (const item of list) {
    await DefaultVal.create({
      ...item,
      repositoryId,
    })
  }

  ctx.body = {
    isOk: true,
  }
})

router.get('/interface/get', async (ctx) => {
  const id = +ctx.query.id

  if (id === undefined || !id) {
    ctx.body = {
      isOk: false,
      errMsg: '请输入参数id'
    }
    return
  }

  let itf = await Interface.findByPk(id, {
    include: [QueryInclude.Locker],
    attributes: { exclude: [] },
  })

  if (!itf) {
    ctx.body = {
      isOk: false,
      errMsg: `没有找到 id 为 ${id} 的接口`
    }
    return
  }

  if (
    !(await AccessUtils.canUserAccess(
      ACCESS_TYPE.REPOSITORY_GET,
      ctx.session.id,
      itf.repositoryId
    ))
  ) {
    ctx.body = Consts.COMMON_ERROR_RES.ACCESS_DENY
    return
  }

  const itfJSON: { [k: string]: any } = itf.toJSON()

  let properties: any[] = await Property.findAll({
    attributes: { exclude: [] },
    where: { interfaceId: itf.id },
  })

  properties = properties.map((item: any) => item.toJSON())
  itfJSON['properties'] = properties

  let scopes = ['request', 'response']
  for (let i = 0; i < scopes.length; i++) {
    let scopeProperties = properties
      .filter(p => p.scope === scopes[i])
      .map((item: any) => ({ ...item }))
    itfJSON[scopes[i] + 'Properties'] = Tree.ArrayToTree(scopeProperties).children
  }

  ctx.type = 'json'
  ctx.body = Tree.stringifyWithFunctonAndRegExp({ data: itfJSON })
})

router.post('/interface/create', isLoggedIn, async (ctx, next) => {
  let creatorId = ctx.session.id
  let body = Object.assign(ctx.request.body, { creatorId })
  body.priority = Date.now()
  let created = await Interface.create(body)
  // await initInterface(created)
  ctx.body = {
    data: {
      itf: await Interface.findByPk(created.id),
    }
  }
  return next()
}, async (ctx) => {
  let itf = ctx.body.data
  await Logger.create({
    userId: ctx.session.id,
    type: 'create',
    repositoryId: itf.repositoryId,
    moduleId: itf.moduleId,
    interfaceId: itf.id,
  })
})

router.post('/interface/update', isLoggedIn, async (ctx, next) => {
  let summary = ctx.request.body
  if (!await AccessUtils.canUserAccess(ACCESS_TYPE.INTERFACE_SET, ctx.session.id, +summary.id)) {
    ctx.body = Consts.COMMON_ERROR_RES.ACCESS_DENY
    return
  }
  const itf = await Interface.findByPk(summary.id)
  const itfChangeLog: string[] = []
  itf.name !== summary.name && itfChangeLog.push(`接口名 \`${itf.name}\` => \`${summary.name}\``)
  itf.url !== summary.url && itfChangeLog.push(`URL \`${itf.url || '空URL'}\` => \`${summary.url}\``)
  itf.method !== summary.method && itfChangeLog.push(`METHOD \`${itf.method}\` => \`${summary.method}\``)
  itfChangeLog.length && await RepositoryService.addHistoryLog({
    entityId: itf.id,
    entityType: Consts.ENTITY_TYPE.INTERFACE,
    changeLog: `接口${itf.name}(${itf.url || '空URL'}) 变更${itfChangeLog.join(LOG_SEPERATOR)}`,
    userId: ctx.session.id,
  })
  await Interface.update(summary, {
    where: { id: summary.id }
  })
  ctx.body = {
    data: {
      itf: await Interface.findByPk(summary.id),
    }
  }
  return next()
}, async (ctx) => {
  if (ctx.body.data === 0) return
  let itf = ctx.request.body
  await Logger.create({
    userId: ctx.session.id,
    type: 'update',
    repositoryId: itf.repositoryId,
    moduleId: itf.moduleId,
    interfaceId: itf.id,
  })
})

router.post('/interface/move', isLoggedIn, async ctx => {
  const { modId, itfId, op } = ctx.request.body
  const itf = await Interface.findByPk(itfId)
  const repositoryId = ctx.request.body.repositoryId || itf.repositoryId
  if (!(await RepositoryService.canUserMoveInterface(ctx.session.id, itfId, repositoryId, modId))) {
    ctx.body = Consts.COMMON_ERROR_RES.ACCESS_DENY
    return
  }

  await RepositoryService.moveInterface(op, itfId, repositoryId, modId)

  ctx.body = {
    data: {
      isOk: true,
    },
  }
})

router.get('/interface/remove', async (ctx, next) => {
  let id = +ctx.query.id
  if (!await AccessUtils.canUserAccess(ACCESS_TYPE.INTERFACE_SET, ctx.session.id, +id)) {
    ctx.body = Consts.COMMON_ERROR_RES.ACCESS_DENY
    return
  }
  const itf = await Interface.findByPk(id)
  const properties = await Property.findAll({ where: { interfaceId: id } })
  await RepositoryService.addHistoryLog({
    entityId: itf.repositoryId,
    entityType: Consts.ENTITY_TYPE.REPOSITORY,
    changeLog: `接口 ${itf.name} (${itf.url}) 被删除，数据已备份。`,
    userId: ctx.session.id,
    relatedJSONData: JSON.stringify({ "itf": itf, "properties": properties })
  })
  let result = await Interface.destroy({ where: { id } })
  await Property.destroy({ where: { interfaceId: id } })
  ctx.body = {
    data: result,
  }
  return next()
}, async (ctx) => {
  if (ctx.body.data === 0) return
  const id = +ctx.query.id
  let itf = await Interface.findByPk(id, { paranoid: false })
  await Logger.create({
    userId: ctx.session.id,
    type: 'delete',
    repositoryId: itf.repositoryId,
    moduleId: itf.moduleId,
    interfaceId: itf.id,
  })
})

router.get('/__test__', async (ctx) => {
  const itf = await Interface.findByPk(5331)
  itf.name = itf.name + '+'
  await itf.save()
  ctx.body = {
    data: itf.name
  }
})

router.post('/interface/lock', async (ctx, next) => {
  if (!ctx.session.id) {
    ctx.body = Consts.COMMON_ERROR_RES.NOT_LOGIN
    return
  }

  let { id } = ctx.request.body
  if (!await AccessUtils.canUserAccess(ACCESS_TYPE.INTERFACE_SET, ctx.session.id, +id)) {
    ctx.body = Consts.COMMON_ERROR_RES.ACCESS_DENY
    return
  }
  let itf = await Interface.findByPk(id, {
    attributes: ['lockerId'],
    include: [
      QueryInclude.Locker,
    ]
  })
  if (itf.lockerId) { // DONE 2.3 BUG 接口可能被不同的人重复锁定。如果已经被锁定，则忽略。
    ctx.body = {
      data: itf.locker,
    }
    return
  }

  await Interface.update({ lockerId: ctx.session.id }, { where: { id } })
  itf = await Interface.findByPk(id, {
    attributes: ['lockerId'],
    include: [
      QueryInclude.Locker,
    ]
  })
  ctx.body = {
    data: itf.locker,
  }
  return next()
})

router.post('/interface/unlock', async (ctx) => {
  if (!ctx.session.id) {
    ctx.body = Consts.COMMON_ERROR_RES.NOT_LOGIN
    return
  }

  let { id } = ctx.request.body
  if (!await AccessUtils.canUserAccess(ACCESS_TYPE.INTERFACE_SET, ctx.session.id, +id)) {
    ctx.body = Consts.COMMON_ERROR_RES.ACCESS_DENY
    return
  }
  let itf = await Interface.findByPk(id, { attributes: ['lockerId'] })
  if (itf.lockerId !== ctx.session.id) { // DONE 2.3 BUG 接口可能被其他人解锁。如果不是同一个用户，则忽略。
    ctx.body = {
      isOk: false,
      errMsg: '您不是锁定该接口的用户，无法对其解除锁定状态。请刷新页面。',
    }
    return
  }
  await Interface.update({
    // tslint:disable-next-line:no-null-keyword
    lockerId: null,
  }, {
    where: { id }
  })

  ctx.body = {
    data: {
      isOk: true,
    }
  }
})

router.post('/interface/sort', async (ctx) => {
  let { ids } = ctx.request.body
  let counter = 1
  for (let index = 0; index < ids.length; index++) {
    await Interface.update({ priority: counter++ }, {
      where: { id: ids[index] }
    })
  }
  ctx.body = {
    data: ids.length,
  }
})

router.get('/property/count', async (ctx) => {
  ctx.body = {
    data: 0
  }
})

router.get('/property/list', async (ctx) => {
  let where: any = {}
  let { repositoryId, moduleId, interfaceId, name } = ctx.query
  if (repositoryId) where.repositoryId = repositoryId
  if (moduleId) where.moduleId = moduleId
  if (interfaceId) where.interfaceId = interfaceId
  if (name) where.name = { [Op.like]: `%${name}%` }
  ctx.body = {
    data: await Property.findAll({ where }),
  }
})

router.get('/property/get', async (ctx) => {
  const id = +ctx.query.id
  ctx.body = {
    data: await Property.findByPk(id, {
      attributes: { exclude: [] }
    })
  }
})

router.post('/property/create', isLoggedIn, async (ctx) => {
  let creatorId = ctx.session.id
  let body = Object.assign(ctx.request.body, { creatorId })
  let created = await Property.create(body)
  ctx.body = {
    data: await Property.findByPk(created.id, {
      attributes: { exclude: [] }
    })
  }
})

router.post('/property/update', isLoggedIn, async (ctx) => {
  let properties = ctx.request.body // JSON.parse(ctx.request.body)
  properties = Array.isArray(properties) ? properties : [properties]
  let result = 0
  for (let item of properties) {
    let property = _.pick(item, Object.keys(Property.rawAttributes))
    let affected = await Property.update(property, {
      where: { id: property.id },
    })
    result += affected[0]
  }
  ctx.body = {
    data: result,
  }
})

router.post('/properties/update', isLoggedIn, async (ctx, next) => {
  const itfId = +ctx.query.itf
  let needBackup = false
  let changeCount = 0
  let { properties, summary } = ctx.request.body as { properties: Property[], summary: Interface }
  properties = Array.isArray(properties) ? properties : [properties]

  let itf = await Interface.findByPk(itfId)

  if (!await AccessUtils.canUserAccess(ACCESS_TYPE.INTERFACE_SET, ctx.session.id, itfId)) {
    ctx.body = Consts.COMMON_ERROR_RES.ACCESS_DENY
    return
  }

  if (summary.bodyOption) {
    itf.bodyOption = summary.bodyOption
    await itf.save()
  }


  const itfPropertiesChangeLog: string[] = []

  // 删除不在更新列表中的属性
  // DONE 2.2 清除幽灵属性：子属性的父属性不存在（原因：前端删除父属性后，没有一并删除后代属性，依然传给了后端）
  // SELECT * FROM properties WHERE parentId!=-1 AND parentId NOT IN (SELECT id FROM properties)
  /* 查找和删除脚本
    SELECT * FROM properties
      WHERE
        deletedAt is NULL AND
        parentId != - 1 AND
        parentId NOT IN (
          SELECT * FROM (
            SELECT id FROM properties WHERE deletedAt IS NULL
          ) as p
        )
  */

  const pLog = (p: Property, title: string) => `\`${title}\`${p.scope === 'request' ? '请求' : '响应'}参数\`${p.name}\`${p.description ? '(' + p.description + ')' : ''}`

  const existingProperties = properties.filter((item: any) => !item.memory)
  const existingPropertyIds = existingProperties.map(x => x.id)

  const originalProperties = await Property.findAll({ where: { interfaceId: itfId } })

  const backupJSON = JSON.stringify({ "itf": itf, "properties": originalProperties })

  const deletedProperties = originalProperties.filter(x => existingPropertyIds.indexOf(x.id) === -1)

  const deletedPropertyLog: string[] = []
  for (const deletedProperty of deletedProperties) {
    deletedPropertyLog.push(pLog(deletedProperty, '删除了'))
  }
  changeCount += deletedProperties.length
  deletedPropertyLog.length && itfPropertiesChangeLog.push(deletedPropertyLog.join(LOG_SUB_SEPERATOR))

  let result = await Property.destroy({
    where: {
      id: { [Op.notIn]: existingProperties.map((item: any) => item.id) },
      interfaceId: itfId
    }
  })

  const updatedPropertyLog: string[] = []
  // 更新已存在的属性
  for (let item of existingProperties) {
    const changed: string[] = []
    const o = originalProperties.filter(x => x.id === item.id)[0]
    if (o) {
      if (o.name !== item.name) {
        changed.push(`变量名${o.name} => ${item.name}`)
      }
      // mock rules 不记入日志
      if (o.type !== item.type) {
        changed.push(`类型${o.type} => ${item.type}`)
      }
      changed.length && updatedPropertyLog.push(`${pLog(item, '更新了')} ${changed.join(' ')}`)
      changeCount += changed.length
    }
    let affected = await Property.update(item, {
      where: { id: item.id },
    })
    result += affected[0]
  }
  updatedPropertyLog.length && itfPropertiesChangeLog.push(updatedPropertyLog.join(LOG_SUB_SEPERATOR))
  // 插入新增加的属性
  let newProperties = properties.filter((item: any) => item.memory)
  let memoryIdsMap: any = {}
  const addedPropertyLog: string[] = []
  for (let item of newProperties) {
    let created = await Property.create(Object.assign({}, item, {
      id: undefined,
      parentId: -1,
      priority: item.priority || Date.now()
    }))
    addedPropertyLog.push(pLog(item, '新增了'))
    memoryIdsMap[item.id] = created.id
    item.id = created.id
    result += 1
  }
  changeCount += newProperties.length
  addedPropertyLog.length && itfPropertiesChangeLog.push(addedPropertyLog.join(LOG_SUB_SEPERATOR))
  // 同步 parentId
  for (let item of newProperties) {
    let parentId = memoryIdsMap[item.parentId] || item.parentId
    await Property.update({ parentId }, {
      where: { id: item.id },
    })
  }
  itf = await Interface.findByPk(itfId, {
    include: (QueryInclude.RepositoryHierarchy as any).include[0].include,
  })

  if (changeCount >= 5) {
    needBackup = true
  }

  if (itfPropertiesChangeLog.length) {
    await RepositoryService.addHistoryLog({
      entityId: itf.id,
      entityType: Consts.ENTITY_TYPE.INTERFACE,
      changeLog: `接口 ${itf.name}(${itf.url}) 参数变更： ${itfPropertiesChangeLog.join(LOG_SEPERATOR)}${needBackup ? ', 改动较大已备份数据。' : ''}`,
      userId: ctx.session.id,
      ...needBackup ? { relatedJSONData: backupJSON } : {},
    })
  }

  ctx.body = {
    data: {
      result,
      properties: itf.properties,
    }
  }
  return next()
}, async (ctx) => {
  if (ctx.body.data === 0) return
  let itf = await Interface.findByPk(ctx.query.itf as string, {
    attributes: { exclude: [] }
  })
  await Logger.create({
    userId: ctx.session.id,
    type: 'update',
    repositoryId: itf.repositoryId,
    moduleId: itf.moduleId,
    interfaceId: itf.id,
  })
})

router.get('/property/remove', isLoggedIn, async (ctx) => {
  let { id } = ctx.query
  if (!await AccessUtils.canUserAccess(ACCESS_TYPE.PROPERTY_SET, ctx.session.id, +id)) {
    ctx.body = Consts.COMMON_ERROR_RES.ACCESS_DENY
    return
  }
  ctx.body = {
    data: await Property.destroy({
      where: { id },
    }),
  }
})

router.post('/repository/import', isLoggedIn, async (ctx) => {
  const { docUrl, orgId, version, projectData } = ctx.request.body
  if (!await AccessUtils.canUserAccess(ACCESS_TYPE.ORGANIZATION_SET, ctx.session.id, orgId)) {
    ctx.body = Consts.COMMON_ERROR_RES.ACCESS_DENY
    return
  }
  let success = false
  let message = ''
  try {
    if (+version === 3) {
      await MigrateService.importRepoFromJSON(JSON5.parse(projectData).data, ctx.session.id, true, orgId)
      success = true
    } else {
      success = await MigrateService.importRepoFromRAP1DocUrl(orgId, ctx.session.id, docUrl, +version, projectData)
    }
  } catch (ex) {
    success = false
    message = ex.message
  }
  ctx.body = {
    isOk: success,
    message: success ? '导入成功' : `导入失败：${message}`,
  }
})

router.post('/repository/importswagger', isLoggedIn, async (ctx) => {
  const { orgId, repositoryId, swagger, version = 1, mode = 'manual' } = ctx.request.body
  // 权限判断
  if (!await AccessUtils.canUserAccess(ACCESS_TYPE.REPOSITORY_SET, ctx.session.id, repositoryId)) {
    ctx.body = Consts.COMMON_ERROR_RES.ACCESS_DENY
    return
  }

  const result = await MigrateService.importRepoFromSwaggerDocUrl(orgId, ctx.session.id, swagger, version, mode, repositoryId)

  ctx.body = {
    isOk: result.code,
    message: result.code === 'success' ? '导入成功' : '导入失败',
    repository: {
      id: 1,
    }
  }
})

router.post('/repository/importRAP2Backup', isLoggedIn, async (ctx) => {
  const { repositoryId, swagger, modId } = ctx.request.body
  // 权限判断
  if (!await AccessUtils.canUserAccess(ACCESS_TYPE.REPOSITORY_SET, ctx.session.id, repositoryId)) {
    ctx.body = Consts.COMMON_ERROR_RES.ACCESS_DENY
    return
  }

  try {
    await MigrateService.importInterfaceFromJSON(swagger, ctx.session.id, repositoryId, modId)
    ctx.body = {
      isOk: 'success',
      message: '导入成功',
      repository: {
        id: 1,
      }
    }
  } catch (ex) {
    ctx.body = {
      isOk: 'failure',
      message: `导入失败: ${ex.message}`,
    }
  }
})

router.post('/repository/importJSON', isLoggedIn, async ctx => {
  const { data } = ctx.request.body

  if (!(await AccessUtils.canUserAccess(ACCESS_TYPE.REPOSITORY_SET, ctx.session.id, data.id))) {
    ctx.body = Consts.COMMON_ERROR_RES.ACCESS_DENY
    return
  }
  try {
    await MigrateService.importRepoFromJSON(data, ctx.session.id)
    ctx.body = {
      isOk: true,
      repository: {
        id: data.id,
      },
    }
  } catch (error) {
    ctx.body = {
      isOk: false,
      message: '服务器错误，导入失败'
    }
    throw (error)
  }


})

router.get('/:type/history/:itfId', isLoggedIn, async ctx => {
  const pager: IPager = {
    limit: +ctx.query.limit || 10,
    offset: +ctx.query.offset || 0,
  }
  let type: ENTITY_TYPE
  if (ctx.params.type === 'interface') {
    type = ENTITY_TYPE.INTERFACE
  } else if (ctx.params.type === 'repository') {
    type = ENTITY_TYPE.REPOSITORY
  } else {
    ctx.body = {
      isOk: false,
      errMsg: 'error path',
    }
    return
  }
  ctx.body = {
    isOk: true,
    data: await RepositoryService.getHistoryLog(+ctx.params.itfId, type, pager)
  }
})

router.get('/interface/history/JSONData/:id', isLoggedIn, async ctx => {
  const historyLogId = +ctx.params.id
  ctx.set('Content-disposition', `attachment; filename=history_log_detail_data_${historyLogId}`)
  ctx.set('Content-type', 'text/html; charset=UTF-8')
  ctx.body = await RepositoryService.getHistoryLogJSONData(historyLogId)
})

router.get('/interface/backup/JSONData/:id', isLoggedIn, async ctx => {
  const itfId = +ctx.params.id
  ctx.set('Content-disposition', `attachment; filename=interface_backup_${itfId}`)
  ctx.set('Content-type', 'text/html; charset=UTF-8')
  ctx.body = await RepositoryService.getInterfaceJSONData(itfId)
})
