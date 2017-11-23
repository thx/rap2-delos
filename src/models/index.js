// TODO 2.2 如何缓存重复查询？https://github.com/rfink/sequelize-redis-cache
const Helper = require('./helper')
const User = require('./user')
const Organization = require('./organization')
const Repository = require('./repository')
const Module = require('./module')
const Interface = require('./interface')
const Property = require('./property')
const Logger = require('./logger')
const Notification = require('./notification')

// http://docs.sequelizejs.com/manual/tutorial/associations.html

User.OwnedOrganizations = User.hasMany(Organization, { foreignKey: 'ownerId', constraints: false, as: 'ownedOrganizations' })
User.JoinedOrganizations = User.belongsToMany(Organization, { through: 'organizations_members', as: 'joinedOrganizations' })

User.OwnedRepositories = User.hasMany(Repository, { foreignKey: 'ownerId', constraints: false, as: 'ownedRepositories' })
User.JoinedRepositories = User.belongsToMany(Repository, { through: 'repositories_members', as: 'joinedRepositories' })

Organization.Creator = Organization.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' }) // 创建者
Organization.Owner = Organization.belongsTo(User, { foreignKey: 'ownerId', constraints: false, as: 'owner' }) // 所有者
Organization.Members = Organization.belongsToMany(User, { through: 'organizations_members', as: 'members' }) // 团队成员
Organization.Repositories = Organization.hasMany(Repository, { foreignKey: 'organizationId', constraints: false, as: 'repositories' })

Repository.Creator = Repository.belongsTo(User, { foreignKey: 'creatorId', constraints: false, as: 'creator' }) // 创建者
Repository.Owner = Repository.belongsTo(User, { foreignKey: 'ownerId', constraints: false, as: 'owner' }) // 所有者
Repository.Organization = Repository.belongsTo(Organization, { foreignKey: 'organizationId', constraints: false, as: 'organization' }) // 所属团队
Repository.Locker = Repository.belongsTo(User, { foreignKey: 'lockerId', constraints: false, as: 'locker' }) // 锁定者
Repository.Members = Repository.belongsToMany(User, { through: 'repositories_members', as: 'members' }) // 仓库成员
Repository.Modules = Repository.hasMany(Module, { foreignKey: 'repositoryId', constraints: false, as: 'modules' })
Repository.Interfaces = Repository.hasMany(Interface, { foreignKey: 'repositoryId', constraints: false, as: 'interfaces' })

Repository.Collaborators = Repository.belongsToMany(Repository, { through: 'repositories_collaborators', as: 'collaborators' }) // 仓库共享

Module.Creator = Module.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' }) // 创建者
Module.Repository = Module.belongsTo(Repository, { foreignKey: 'repositoryId', as: 'repository' })
Module.Interfaces = Module.hasMany(Interface, { foreignKey: 'moduleId', constraints: false, as: 'interfaces' })

Interface.Creator = Interface.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' }) // 创建者
Interface.Locker = Interface.belongsTo(User, { foreignKey: 'lockerId', as: 'locker' }) // 锁定者
Interface.Module = Interface.belongsTo(Module, { foreignKey: 'moduleId', as: 'module' })
Interface.Repository = Interface.belongsTo(Repository, { foreignKey: 'repositoryId', as: 'repository' })
Interface.Properties = Interface.hasMany(Property, { foreignKey: 'interfaceId', constraints: false, as: 'properties' })

Property.Creator = Property.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' }) // 创建者
Property.Interface = Property.belongsTo(Interface, { foreignKey: 'interfaceId', as: 'interface' })
Property.Module = Property.belongsTo(Module, { foreignKey: 'moduleId', as: 'module' })
Property.Repository = Property.belongsTo(Repository, { foreignKey: 'repositoryId', as: 'repository' })

Logger.Creator = Logger.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' })
Logger.User = Logger.belongsTo(User, { foreignKey: 'userId', as: 'user' })
Logger.Repository = Logger.belongsTo(Repository, { foreignKey: 'repositoryId', as: 'repository' })
Logger.Organization = Logger.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' })
Logger.Module = Logger.belongsTo(Module, { foreignKey: 'moduleId', as: 'module' })
Logger.Interface = Logger.belongsTo(Interface, { foreignKey: 'interfaceId', as: 'interface' })

const QueryInclude = {
  User: { model: User, as: 'user', attributes: { exclude: ['password', ...Helper.exclude.generalities] }, required: true },
  Creator: { model: User, as: 'creator', attributes: { exclude: ['password', ...Helper.exclude.generalities] }, required: true },
  Owner: { model: User, as: 'owner', attributes: { exclude: ['password', ...Helper.exclude.generalities] }, required: true },
  Locker: { model: User, as: 'locker', attributes: { exclude: ['password', ...Helper.exclude.generalities] }, required: false },
  Members: { model: User, as: 'members', attributes: { exclude: ['password', ...Helper.exclude.generalities] }, through: { attributes: [] }, required: false },
  Repository: { model: Repository, as: 'repository', attributes: { exclude: [] }, paranoid: false, required: false },
  Organization: { model: Organization, as: 'organization', attributes: { exclude: [] }, paranoid: false, required: false },
  Module: { model: Module, as: 'module', attributes: { exclude: [] }, paranoid: false, required: false },
  Interface: { model: Interface, as: 'interface', attributes: { exclude: [] }, paranoid: false, required: false },
  Collaborators: { model: Repository, as: 'collaborators', attributes: { exclude: [] }, through: { attributes: [] }, required: false },
  RepositoryHierarchy: {
    model: Module,
    as: 'modules',
    attributes: { exclude: [] },
    required: false,
    separate: true,
    order: [
      ['priority', 'ASC']
    ],
    include: [{
      model: Interface,
      as: 'interfaces',
      attributes: { exclude: [] },
      required: false,
      separate: true,
      order: [
        ['priority', 'ASC']
      ],
      include: [{
        model: User,
        as: 'locker',
        attributes: { exclude: ['password', ...Helper.exclude.generalities] },
        required: false
      }, {
        model: Property,
        as: 'properties',
        attributes: { exclude: [] },
        required: false,
        separate: true
      }]
    }]
  },
  Properties: {
    model: Property,
    as: 'properties',
    attributes: { exclude: [] },
    required: false
  }
}

module.exports = {
  User, Organization, Repository, Module, Interface, Property, Logger, Notification, Helper, QueryInclude
}
