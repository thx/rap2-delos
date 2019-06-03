// TODO 2.2 如何缓存重复查询？https://github.com/rfink/sequelize-redis-cache
import { Helper } from './helper'
import User from '../bo/user'
import Repository from '../bo/repository'
import Module from '../bo/module'
import Organization from '../bo/organization'
import Interface from '../bo/interface'
import Property from '../bo/property'
import { IncludeOptions } from 'sequelize'

declare interface IQueryInclude {
  [key: string]: IncludeOptions
}

const QueryInclude: IQueryInclude = {
  User: { model: User, as: 'user', attributes: { exclude: ['password', ...Helper.exclude.generalities] }, required: true },
  UserForSearch: { model: User, as: 'user', attributes: { include: ['id', 'fullname'] }, required: true },
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
    include: [{
      model: Interface,
      as: 'interfaces',
      attributes: { exclude: [] },
      required: false,
      include: [{
        model: User,
        as: 'locker',
        attributes: { exclude: ['password', ...Helper.exclude.generalities] },
        required: false,
      }, {
        model: Property,
        as: 'properties',
        attributes: { exclude: [] },
        required: false,
      }],
    }],
  },
  Properties: {
    model: Property,
    as: 'properties',
    attributes: { exclude: [] },
    required: false,
  },
}

export default QueryInclude