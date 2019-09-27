import { Table, Column, Model, HasMany, AutoIncrement, PrimaryKey, AllowNull, DataType, Default, BelongsTo, ForeignKey, BeforeCreate, BeforeUpdate, BeforeDestroy, BeforeBulkCreate, BeforeBulkDestroy, BeforeBulkUpdate } from 'sequelize-typescript'
import { User, Repository, Interface } from '../'
import RedisService, { CACHE_KEY } from '../../service/redis'
import * as Sequelize from 'sequelize'

const Op = Sequelize.Op

@Table({ paranoid: true, freezeTableName: false, timestamps: true })
export default class Module extends Model<Module> {
/** hooks */
  @BeforeCreate
  @BeforeUpdate
  @BeforeDestroy
  static async deleteCache(instance: Module) {
     await RedisService.delCache(CACHE_KEY.REPOSITORY_GET, instance.repositoryId)
  }

  @BeforeBulkCreate
  @BeforeBulkUpdate
  @BeforeBulkDestroy
  static async bulkDeleteCache(options: any) {
    let id: number = options && options.attributes && options.attributes.id
    if (!id) {
      id = options.where && +options.where.id
    }
    if (options.where && options.where[Op.and]) {
      const arr = options.where[Op.and]
      if (arr && arr[1] && arr[1].id) {
        id = arr[1].id
      }
    }
    if ((id as any) instanceof Array) {
      id = (id as any)[0]
    }
    if (id) {
      const mod = await Module.findByPk(id)
      await RedisService.delCache(CACHE_KEY.REPOSITORY_GET, mod.repositoryId)
    }
  }

  @AutoIncrement
  @PrimaryKey
  @Column
  id: number

  @AllowNull(false)
  @Column(DataType.STRING(256))
  name: string


  @AllowNull(false)
  @Column(DataType.TEXT)
  description: string

  @AllowNull(false)
  @Default(1)
  @Column(DataType.BIGINT())
  priority: number

  @ForeignKey(() => User)
  @Column
  creatorId: number

  @ForeignKey(() => Repository)
  @Column
  repositoryId: number

  @BelongsTo(() => User, 'creatorId')
  creator: User

  @BelongsTo(() => Repository, 'repositoryId')
  repository: Repository

  @HasMany(() => Interface, 'moduleId')
  interfaces: Interface[]
}