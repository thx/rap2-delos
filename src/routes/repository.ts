// TODO 2.1 大数据测试，含有大量模块、接口、属性的仓库
import router from './router'
import * as _ from 'underscore'
import Pagination from './utils/pagination'
import { User, Organization, Repository, Module, Interface, Property, QueryInclude, Logger } from '../models'
import { Sequelize } from 'sequelize-typescript'
import Tree from './utils/tree'
import { AccessUtils, ACCESS_TYPE } from './utils/access'
import * as Consts from './utils/const'
import RedisService, { CACHE_KEY } from '../service/redis'
import MigrateService from '../service/migrate';

const { initRepository, initModule } = require('./utils/helper')
const Op = Sequelize.Op

router.get('/app/get', async (ctx, next) => {
  let data: any = {}
  let query = ctx.query
  let hooks: any = {
    repository: Repository,
    module: Module,
    interface: Interface,
    property: Property,
  }
  for (let name in hooks) {
    if (!query[name]) continue
    data[name] = await hooks[name].findById(query[name])
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
    const access = await AccessUtils.canUserAccess(ACCESS_TYPE.ORGANIZATION, ctx.session.id, organization)

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
      QueryInclude.Locker,
    ],
  } as any)
  let pagination = new Pagination(total, ctx.query.cursor || 1, ctx.query.limit || 100)
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
    order: [['updatedAt', 'DESC']],
  } as any)
  ctx.body = {
    isOk: true,
    data: repositories,
    pagination: pagination,
  }
})

router.get('/repository/owned', async (ctx) => {
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

  let auth: User = await User.findById(ctx.query.user || ctx.session.id)
  if (!auth) {
    ctx.body = {
      isOk: false,
      errMsg: '登陆过期了，请重新登陆。',
    }
  }
  // let total = await auth.countOwnedRepositories({ where })
  // let pagination = new Pagination(total, ctx.query.cursor || 1, ctx.query.limit || 100)
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
    // offset: pagination.start,
    // limit: pagination.limit,
    order: [['updatedAt', 'DESC']],
  })
  ctx.body = {
    data: repositories,
    pagination: undefined,
  }
})
router.get('/repository/joined', async (ctx) => {
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

  let auth = await User.findById(ctx.query.user || ctx.session.id)
  // let total = await auth.countJoinedRepositories({ where })
  // let pagination = new Pagination(total, ctx.query.cursor || 1, ctx.query.limit || 100)
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
    // offset: pagination.start,
    // limit: pagination.limit,
    order: [['updatedAt', 'DESC']],
  })
  ctx.body = {
    data: repositories,
    pagination: undefined,
  }
})

router.get('/repository/get', async (ctx) => {
  const access = await AccessUtils.canUserAccess(ACCESS_TYPE.REPOSITORY, ctx.session.id, ctx.query.id)
  if (access === false) {
    ctx.body = {
      isOk: false,
      errMsg: Consts.COMMON_MSGS.ACCESS_DENY
    }
    return
  }
  const tryCache = await RedisService.getCache(CACHE_KEY.REPOSITORY_GET, ctx.query.id)
  let repository: Repository
  if (tryCache) {
    console.log(`from cache`)
    repository = JSON.parse(tryCache)
  } else {
    console.log(`from db`)
    repository = await Repository.findById(ctx.query.id, {
      attributes: { exclude: [] },
      include: [
        QueryInclude.Creator,
        QueryInclude.Owner,
        QueryInclude.Locker,
        QueryInclude.Members,
        QueryInclude.Organization,
        QueryInclude.RepositoryHierarchy,
        QueryInclude.Collaborators
      ],
      order: [
        [{ model: Module, as: 'modules' }, 'priority', 'asc'],
        [{ model: Module, as: 'modules' }, { model: Interface, as: 'interfaces' }, 'priority', 'asc']
      ]
    })
    await RedisService.setCache(CACHE_KEY.REPOSITORY_GET, JSON.stringify(repository), ctx.query.id)
  }
  ctx.body = {
    data: repository,
  }
})

router.post('/repository/create', async (ctx, next) => {
  let creatorId = ctx.session.id
  let body = Object.assign({}, ctx.request.body, { creatorId, ownerId: creatorId })
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
    data: await Repository.findById(created.id, {
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
router.post('/repository/update', async (ctx, next) => {
  let body = Object.assign({}, ctx.request.body)
  delete body.creatorId
  // DONE 2.2 支持转移仓库
  // delete body.ownerId
  delete body.organizationId
  let result = await Repository.update(body, { where: { id: body.id } })
  if (body.memberIds) {
    let reloaded = await Repository.findById(body.id, {
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
    let reloaded = await Repository.findById(body.id)
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
router.post('/repository/transfer', async (ctx) => {
  let { id, ownerId, organizationId } = ctx.request.body
  let body: any = {}
  if (ownerId) body.ownerId = ownerId // 转移给其他用户
  if (organizationId) {
    body.organizationId = organizationId // 转移给其他团队，同时转移给该团队拥有者
    body.ownerId = (await Organization.findById(organizationId)).ownerId
  }
  let result = await Repository.update(body, { where: { id } })
  ctx.body = {
    data: result[0],
  }
})
router.get('/repository/remove', async (ctx, next) => {
  let { id } = ctx.query
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
router.post('/repository/lock', async (ctx) => {
  let user = ctx.session.id
  if (!user) {
    ctx.body = { data: 0 }
    return
  }
  let { id } = ctx.request.body
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
    data: await Module.findById(ctx.query.id, {
      attributes: { exclude: [] },
    }),
  }
})
router.post('/module/create', async (ctx, next) => {
  let creatorId = ctx.session.id
  let body = Object.assign(ctx.request.body, { creatorId })
  body.priority = Date.now()
  let created = await Module.create(body)
  await initModule(created)
  ctx.body = {
    data: await Module.findById(created.id),
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
router.post('/module/update', async (ctx, next) => {
  const { id, name, description } = ctx.request.body
  await Module.update({ name, description, id }, {
    where: { id }
  })
  ctx.body = {
    data: {
      name,
      description,
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
router.get('/module/remove', async (ctx, next) => {
  let { id } = ctx.query
  let result = await Module.destroy({ where: { id } })
  await Interface.destroy({ where: { moduleId: id } })
  await Property.destroy({ where: { moduleId: id } })
  ctx.body = {
    data: result,
  }
  return next()
}, async (ctx) => {
  if (ctx.body.data === 0) return
  let { id } = ctx.query
  let mod = await Module.findById(id, { paranoid: false })
  await Logger.create({
    userId: ctx.session.id,
    type: 'delete',
    repositoryId: mod.repositoryId,
    moduleId: mod.id,
  })
})
router.post('/module/sort', async (ctx) => {
  let { ids } = ctx.request.body
  let counter = 1
  for (let index = 0; index < ids.length; index++) {
    await Module.update({ priority: counter++ }, {
      where: { id: ids[index] }
    })
  }
  if (ids && ids.length) {
    const mod = await Module.findById(ids[0])
    await RedisService.delCache(CACHE_KEY.REPOSITORY_GET, mod.repositoryId)
  }
  ctx.body = {
    data: ids.length,
  }
})

//
router.get('/interface/count', async (ctx) => {
  ctx.body = {
    data: await Interface.count(),
  }
})
router.get('/interface/list', async (ctx) => {
  let where: any = {}
  let { repositoryId, moduleId, name } = ctx.query
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
router.get('/interface/get', async (ctx) => {
  let { id, repositoryId, method, url } = ctx.query

  let itf
  if (id) {
    itf = await Interface.findById(id, {
      attributes: { exclude: [] },
    })
  } else if (repositoryId && method && url) {
    // 同 /app/mock/:repository/:method/:url
    let urlWithoutPrefixSlash = /(\/)?(.*)/.exec(url)[2]
    let repository = await Repository.findById(repositoryId)
    let collaborators = await repository.$get('collaborators')

    itf = await Interface.findOne({
      attributes: { exclude: [] },
      where: {
        repositoryId: [repositoryId, ...(<Repository[]>collaborators).map(item => item.id)],
        method,
        url: [urlWithoutPrefixSlash, '/' + urlWithoutPrefixSlash],
      },
    })
  }
  itf = itf.toJSON()

  let scopes = ['request', 'response']
  for (let i = 0; i < scopes.length; i++) {
    let properties = await Property.findAll({
      attributes: { exclude: [] },
      where: { interfaceId: itf.id, scope: scopes[i] },
    })
    properties = properties.map(item => item.toJSON())
    itf[scopes[i] + 'Properties'] = Tree.ArrayToTree(properties).children
  }

  ctx.type = 'json'
  ctx.body = Tree.stringifyWithFunctonAndRegExp({ data: itf })
})
router.post('/interface/create', async (ctx, next) => {
  let creatorId = ctx.session.id
  let body = Object.assign(ctx.request.body, { creatorId })
  body.priority = Date.now()
  let created = await Interface.create(body)
  // await initInterface(created)
  ctx.body = {
    data: {
      itf: await Interface.findById(created.id),
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

router.post('/interface/update', async (ctx, next) => {
  let body = ctx.request.body
  await Interface.update(body, {
    where: { id: body.id }
  })
  ctx.body = {
    data: {
      itf: await Interface.findById(body.id),
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

router.post('/interface/move', async (ctx) => {
  const OP_MOVE = 1
  const OP_COPY = 2
  const { modId, itfId, op } = ctx.request.body
  const itf = await Interface.findById(itfId)
  if (op === OP_MOVE) {
    itf.moduleId = modId
    await Property.update({
      moduleId: modId,
    }, {
      where: {
        interfaceId: itf.id,
      }
    })
    await itf.save()
  } else if (op === OP_COPY) {
    const { id, name, ...otherProps } = itf.dataValues
    const newItf = await Interface.create({
      name: name + '副本',
      ...otherProps,
      moduleId: modId,
    })

    const properties = await Property.findAll({
      where: {
        interfaceId: itf.id,
      }
    })
    for (const property of properties) {
      const { id, ...props } = property.dataValues
      await Property.create({
        ...props,
        interfaceId: newItf.id,
        moduleId: modId,
      })
    }
  }
  ctx.body = {
    data: {
      isOk: true,
    }
  }
})

router.get('/interface/remove', async (ctx, next) => {
  let { id } = ctx.query
  let result = await Interface.destroy({ where: { id } })
  await Property.destroy({ where: { interfaceId: id } })
  ctx.body = {
    data: result,
  }
  return next()
}, async (ctx) => {
  if (ctx.body.data === 0) return
  let { id } = ctx.query
  let itf = await Interface.findById(id, { paranoid: false })
  await Logger.create({
    userId: ctx.session.id,
    type: 'delete',
    repositoryId: itf.repositoryId,
    moduleId: itf.moduleId,
    interfaceId: itf.id,
  })
})

router.get('/__test__', async (ctx) => {
  const itf = await Interface.findById(5331)
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
  let itf = await Interface.findById(id, {
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
  itf = await Interface.findById(id, {
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
  let itf = await Interface.findById(id, { attributes: ['lockerId'] })
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
  let { id } = ctx.query
  ctx.body = {
    data: await Property.findById(id, {
      attributes: { exclude: [] },
    }),
  }
})

router.post('/property/create', async (ctx) => {
  let creatorId = ctx.session.id
  let body = Object.assign(ctx.request.body, { creatorId })
  let created = await Property.create(body)
  ctx.body = {
    data: await Property.findById(created.id, {
      attributes: { exclude: [] },
    }),
  }
})

router.post('/property/update', async (ctx) => {
  let properties = ctx.request.body // JSON.parse(ctx.request.body)
  properties = Array.isArray(properties) ? properties : [properties]
  let result = 0
  for (let item of properties) {
    let property = _.pick(item, Object.keys(Property.attributes))
    let affected = await Property.update(property, {
      where: { id: property.id },
    })
    result += affected[0]
  }
  ctx.body = {
    data: result,
  }
})

router.post('/properties/update', async (ctx, next) => {
  const itfId = +ctx.query.itf
  let { properties, summary } = ctx.request.body // JSON.parse(ctx.request.body)
  properties = Array.isArray(properties) ? properties : [properties]

  let itf = await Interface.findById(itfId)

  if (summary.name) {
    itf.name = summary.name
  }
  if (summary.url) {
    itf.url = summary.url
  }
  if (summary.method) {
    itf.method = summary.method
  }
  if (summary.description) {
    itf.description = summary.description
  }

  await itf.save()

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
  let existingProperties = properties.filter((item: any) => !item.memory)
  let result = await Property.destroy({
    where: {
      id: { [Op.notIn]: existingProperties.map((item: any) => item.id) },
      interfaceId: itfId
    }
  })
  // 更新已存在的属性
  for (let item of existingProperties) {
    let affected = await Property.update(item, {
      where: { id: item.id },
    })
    result += affected[0]
  }
  // 插入新增加的属性
  let newProperties = properties.filter((item: any) => item.memory)
  let memoryIdsMap: any = {}
  for (let item of newProperties) {
    let created = await Property.create(Object.assign({}, item, {
      id: undefined,
      parentId: -1,
      priority: item.priority || Date.now()
    }))
    memoryIdsMap[item.id] = created.id
    item.id = created.id
    result += 1
  }
  // 同步 parentId
  for (let item of newProperties) {
    let parentId = memoryIdsMap[item.parentId] || item.parentId
    await Property.update({ parentId }, {
      where: { id: item.id },
    })
  }
  itf = await Interface.findById(itfId, {
    include: (QueryInclude.RepositoryHierarchy as any).include[0].include,
  })
  ctx.body = {
    data: {
      result,
      properties: itf.properties,
    }
  }
  return next()
}, async (ctx) => {
  if (ctx.body.data === 0) return
  let itf = await Interface.findById(ctx.query.itf, {
    attributes: { exclude: [] },
  })
  await Logger.create({
    userId: ctx.session.id,
    type: 'update',
    repositoryId: itf.repositoryId,
    moduleId: itf.moduleId,
    interfaceId: itf.id,
  })
})

router.get('/property/remove', async (ctx) => {
  let { id } = ctx.query
  ctx.body = {
    data: await Property.destroy({
      where: { id },
    }),
  }
})

router.post('/repository/import', async (ctx) => {
  if (!ctx.session || !ctx.session.id) {
    ctx.body = {
      isOk: false,
      message: 'NOT LOGIN'
    }
    return
  }
  const { docUrl, orgId } = ctx.request.body
  const result = await MigrateService.importRepoFromRAP1DocUrl(orgId, ctx.session.id, docUrl)
  ctx.body = {
    isOk: result,
    message: result ? '导入成功' : '导入失败',
    repository: {
      id: 1,
    }
  }
})
