import sequelize from '../../models/sequelize'
import { User, Organization, Repository, Module, Interface, Property, Room } from '../../models/index'
import { BO_ADMIN, BO_MOZHI } from './bo'
import { BO_USER_FN, BO_ORGANIZATION_FN, BO_REPOSITORY_FN, BO_MODULE_FN, BO_INTERFACE_FN, BO_PROPERTY_FN } from './bo'
import { BO_USER_COUNT, BO_ORGANIZATION_COUNT, BO_REPOSITORY_COUNT, BO_MODULE_COUNT, BO_INTERFACE_COUNT, BO_PROPERTY_COUNT } from './bo'

const EMPTY_WHERE = { where: {} }

export async function init () {
  await sequelize.drop()
  await sequelize.sync({
    force: true,
    logging: console.log,
  })
  await Room.destroy(EMPTY_WHERE)
  await User.destroy(EMPTY_WHERE)
  await Organization.destroy(EMPTY_WHERE)
  await Repository.destroy(EMPTY_WHERE)
  await Module.destroy(EMPTY_WHERE)
  await Interface.destroy(EMPTY_WHERE)
  await Property.destroy(EMPTY_WHERE)


  // 用户
  await User.create(BO_ADMIN)
  await User.create(BO_MOZHI)
  for (let i = 0; i < BO_USER_COUNT; i++) {
    await User.create(BO_USER_FN())
  }

  let users = await User.findAll()

  // 用户 admin 仓库
  for (let BO_REPOSITORY_INDEX = 0; BO_REPOSITORY_INDEX < BO_REPOSITORY_COUNT; BO_REPOSITORY_INDEX++) {
    let repository = await Repository.create(
      BO_REPOSITORY_FN({ creatorId: BO_ADMIN.id, ownerId: BO_ADMIN.id }),
    )
    await repository.$set('members', users.filter(user => user.id !== BO_ADMIN.id))
    await initRepository(repository)
  }

  // 用户 mozhi 的仓库
  for (let BO_REPOSITORY_INDEX = 0; BO_REPOSITORY_INDEX < BO_REPOSITORY_COUNT; BO_REPOSITORY_INDEX++) {
    let repository = await Repository.create(
      BO_REPOSITORY_FN({ creatorId: BO_MOZHI.id, ownerId: BO_MOZHI.id }),
    )
    await repository.$set('members', (
      users.filter(user => user.id !== BO_MOZHI.id)
    ))
    await initRepository(repository)
  }

  // 团队
  for (let BO_ORGANIZATION_INDEX = 0; BO_ORGANIZATION_INDEX < BO_ORGANIZATION_COUNT; BO_ORGANIZATION_INDEX++) {
    let organization = await Organization.create(
      BO_ORGANIZATION_FN({ creatorId: BO_ADMIN.id, ownerId: BO_ADMIN.id }),
    )
    await organization.$set('members', (
      users.filter(user => user.id !== BO_ADMIN.id)
    ))
    // 团队的仓库
    for (let BO_REPOSITORY_INDEX = 0; BO_REPOSITORY_INDEX < BO_REPOSITORY_COUNT; BO_REPOSITORY_INDEX++) {
      let repository = await Repository.create(
        BO_REPOSITORY_FN({ creatorId: BO_ADMIN.id, ownerId: BO_ADMIN.id, organizationId: organization.id }),
      )
      await repository.$set('members', users.filter(user => user.id !== BO_ADMIN.id))
      await initRepository(repository)
    }
  }
}

async function initRepository (repository: any) {
  // 模块
  for (let BO_MODULE_INDEX = 0; BO_MODULE_INDEX < BO_MODULE_COUNT; BO_MODULE_INDEX++) {
    let mod = await Module.create(
      BO_MODULE_FN({ creatorId: repository.creatorId, repositoryId: repository.id }),
    )
    await repository.addModule(mod)
    // 接口
    for (let BO_INTERFACE_INDEX = 0; BO_INTERFACE_INDEX < BO_INTERFACE_COUNT; BO_INTERFACE_INDEX++) {
      let itf = await Interface.create(
        BO_INTERFACE_FN({ creatorId: mod.creatorId, repositoryId: repository.id, moduleId: mod.id }),
      )
      await mod.$add('interfaces', itf)
      // 属性
      for (let BO_PROPERTY_INDEX = 0; BO_PROPERTY_INDEX < BO_PROPERTY_COUNT; BO_PROPERTY_INDEX++) {
        let prop = await Property.create(
          BO_PROPERTY_FN({ creatorId: itf.creatorId, repositoryId: repository.id, moduleId: mod.id, interfaceId: itf.id }),
        )
        await itf.$add('properties', prop)
      }
    }
  }
}

export async function after () {
  let exclude = ['password', 'createdAt', 'updatedAt', 'deletedAt']
  let repositories = await Repository.findAll({
    attributes: { exclude: [] },
    include: [
      { model: User, as: 'creator', attributes: { exclude }, required: true },
      { model: User, as: 'owner', attributes: { exclude }, required: true },
      { model: Organization, as: 'organization', attributes: { exclude }, required: false },
      { model: User, as: 'locker', attributes: { exclude }, required: false },
      { model: User, as: 'members', attributes: { exclude }, through: { attributes: [] }, required: true },
      { model: Module,
        as: 'modules',
        attributes: { exclude },
        // through: { attributes: [] },
        include: [
          {
            model: Interface,
            as: 'interfaces',
            attributes: { exclude },
            // through: { attributes: [] },
            include: [
              {
                model: Property,
                as: 'properties',
                attributes: { exclude },
                // through: { attributes: [] },
                required: true,
              },
            ],
            required: true,
          },
        ],
        required: true,
      },
    ],
    offset: 0,
    limit: 100,
  })
  // console.log(JSON.stringify(repositories, null, 2))
  console.log(repositories.map(item => item.toJSON()))

  let admin = await User.findById(BO_ADMIN.id)
  // for (let k in admin) console.log(k)
  let owned: any = await admin.$get('ownedOrganizations')
  console.log(owned.map((item: any) => item.toJSON()))

  let mozhi = await User.findById(BO_MOZHI.id)
  for (let k in mozhi) console.log(k)
  let joined: any = await mozhi.$get('joinedOrganizations')
  console.log(joined.map((item: any) => item.toJSON()))
}