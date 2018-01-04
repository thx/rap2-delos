import router from './router'
import { Organization, User, Logger, Repository, Module, Interface, Property } from '../models'
import { QueryInclude } from '../models';
import * as _ from 'lodash'
import { Pagination } from './utils/pagination'

router.get('/app/get', async (ctx, next) => {
  let data = {}
  let query = ctx.query
  let hooks = {
    organization: Organization
  }
  for (let name in hooks) {
    if (!query[name]) continue
    data[name] = await hooks[name].findById(query[name], {
      attributes: { exclude: [] }
    })
  }
  ctx.body = {
    data: Object.assign({}, ctx.body && ctx.body.data, data)
  }

  return next()
})

router.get('/organization/count', async(ctx, next) => {
  ctx.body = {
    data: await Organization.count()
  }
})
router.get('/organization/list', async(ctx, next) => {
  let where = {}
  let { name } = ctx.query
  if (name) {
    Object.assign(where, {
      $or: [
        { name: { $like: `%${name}%` } },
        { id: name } // name => id
      ]
    })
  }
  let total = await Organization.count({
    where,
    include: [
      QueryInclude.Creator,
      QueryInclude.Owner
    ]
  })
  let pagination = new Pagination(total, ctx.query.cursor || 1, ctx.query.limit || 100)
  let organizations = await Organization.findAll({
    where,
    attributes: { exclude: [] },
    include: [
      QueryInclude.Creator,
      QueryInclude.Owner,
      QueryInclude.Members
    ],
    offset: pagination.start,
    limit: pagination.limit,
    order: [['updatedAt', 'DESC']]
  })
  ctx.body = {
    data: organizations,
    pagination: pagination
  }
})
router.get('/organization/owned', async(ctx, next) => {
  let where = {}
  let { name } = ctx.query
  if (name) {
    Object.assign(where, {
      $or: [
        { name: { $like: `%${name}%` } },
        { id: name } // name => id
      ]
    })
  }

  let auth = await User.findById(ctx.session.id)
  let options:any = {
    where,
    attributes: { exclude: [] },
    include: [QueryInclude.Creator, QueryInclude.Owner, QueryInclude.Members],
    order: [['updatedAt', 'DESC']]
  }
  let owned = await auth.$get('ownedOrganizations', options)
  ctx.body = {
    data: owned,
    pagination: null
  }
})
router.get('/organization/joined', async(ctx, next) => {
  let where = {}
  let { name } = ctx.query
  if (name) {
    Object.assign(where, {
      $or: [
        { name: { $like: `%${name}%` } },
        { id: name } // name => id
      ]
    })
  }

  let auth = await User.findById(ctx.session.id)
  let options:object = {
    where,
    attributes: { exclude: [] },
    include: [QueryInclude.Creator, QueryInclude.Owner, QueryInclude.Members],
    order: [['updatedAt', 'DESC']]
  }
  let joined = await auth.$get('joinedOrganizations', options)
  // await auth.getOwnedOrganizations()
  // await auth.getJoinedOrganizations()
  ctx.body = {
    data: joined,
    pagination: null
  }
})
router.get('/organization/get', async(ctx, next) => {
  let organization = await Organization.findById(ctx.query.id, {
    attributes: { exclude: [] },
    include: [QueryInclude.Creator, QueryInclude.Owner, QueryInclude.Members]
  })
  ctx.body = {
    data: organization
  }
})
router.post('/organization/create', async(ctx, next) => {
  let creatorId = ctx.session.id
  let body = Object.assign({}, ctx.request.body, { creatorId, ownerId: creatorId })
  let created = await Organization.create(body)
  if (body.memberIds) {
    let members = await User.findAll({ where: { id: body.memberIds } })
    await created.$set('members', members)
  }
  let filled = await Organization.findById(created.id, {
    attributes: { exclude: [] },
    include: [QueryInclude.Creator, QueryInclude.Owner, QueryInclude.Members]
  })
  ctx.body = {
    data: filled
  }
})
router.post('/organization/update', async(ctx, next) => {
  let body = Object.assign({}, ctx.request.body)
  delete body.creatorId
  // DONE 2.2 支持转移团队
  // delete body.ownerId
  let updated = await Organization.update(body, { where: { id: body.id } })
  if (body.memberIds) {
    let reloaded = await Organization.findById(body.id)
    let members = await User.findAll({ where: { id: body.memberIds } })
    ctx.prevAssociations = await reloaded.$get('members')
    await reloaded.$set('members', members)
    ctx.nextAssociations = await reloaded.$get('members')
  }
  ctx.body = {
    data: updated[0]
  }
  return next()
}, async(ctx, next) => {
  let { id } = ctx.request.body
  // 团队改
  await Logger.create({
    userId: ctx.session.id,
    type: 'update',
    organizationId: id
  })
  // 加入 & 退出
  if (!ctx.prevAssociations || !ctx.nextAssociations) return
  let prevIds = ctx.prevAssociations.map(item => item.id)
  let nextIds = ctx.nextAssociations.map(item => item.id)
  let joined = _.difference(nextIds, prevIds)
  let exited = _.difference(prevIds, nextIds)
  let creatorId = ctx.session.id
  for (let userId of joined) {
    await Logger.create({ creatorId, userId, type: 'join', organizationId: id })
  }
  for (let userId of exited) {
    await Logger.create({ creatorId, userId, type: 'exit', organizationId: id })
  }
})
router.post('/organization/transfer', async(ctx, next) => {
  let { id, ownerId } = ctx.request.body
  let body = { ownerId }
  let result = await Organization.update(body, { where: { id } })
  ctx.body = {
    data: result[0]
  }
})
router.get('/organization/remove', async(ctx, next) => {
  let { id } = ctx.query
  let result = await Organization.destroy({ where: { id } })
  let repositories = await Repository.findAll({
    where: { organizationId: id }
  })
  if (repositories.length) {
    let ids = repositories.map(item => item.id)
    await Repository.destroy({ where: { id: ids } })
    await Module.destroy({ where: { repositoryId: ids } })
    await Interface.destroy({ where: { repositoryId: ids } })
    await Property.destroy({ where: { repositoryId: ids } })
  }
  ctx.body = {
    data: result
  }
  return next()
}, async(ctx, next) => {
  if (ctx.body.data === 0) return
  let { id } = ctx.query
  await Logger.create({
    userId: ctx.session.id,
    type: 'delete',
    organizationId: id
  })
})