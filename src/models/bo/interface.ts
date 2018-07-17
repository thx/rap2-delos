import { Table, Column, Model, HasMany, AutoIncrement, PrimaryKey, AllowNull, DataType, Default, BelongsTo, ForeignKey, BeforeBulkDelete, BeforeBulkCreate, BeforeBulkUpdate, BeforeCreate, BeforeUpdate, BeforeDelete } from 'sequelize-typescript'
import { User, Module, Repository, Property } from '../';
import RedisService, { CACHE_KEY } from '../../service/redis'

enum methods { GET= 'GET', POST= 'POST', PUT= 'PUT', DELETE= 'DELETE' }

@Table({ paranoid: true, freezeTableName: false, timestamps: true })
export default class Interface extends Model<Interface> {

  /** hooks */
  @BeforeCreate
  @BeforeUpdate
  @BeforeDelete
  static async deleteCache(instance: Interface) {
     await RedisService.delCache(CACHE_KEY.REPOSITORY_GET, instance.repositoryId)
  }

  @BeforeBulkCreate
  @BeforeBulkUpdate
  @BeforeBulkDelete
  static async bulkDeleteCache(options: any) {
    let id: number = options && options.attributes && options.attributes.id
    if (!id) {
      id = options.where && +options.where.id
    }
    if (id) {
      const itf = await Interface.findById(id)
     await RedisService.delCache(CACHE_KEY.REPOSITORY_GET, itf.repositoryId)
    }
  }

  public static METHODS = methods

  public request?: object
  public response?: object

  @AutoIncrement
  @PrimaryKey
  @Column
  id: number

  @AllowNull(false)
  @Column(DataType.STRING(256))
  name: string

  @AllowNull(false)
  @Column(DataType.STRING(256))
  url: string

  @AllowNull(false)
  @Column({ type: DataType.ENUM(methods.GET, methods.POST, methods.PUT, methods.DELETE), comment: 'API method' })
  method: string

  @Column(DataType.TEXT)
  description: string

  @AllowNull(false)
  @Default(1)
  @Column(DataType.BIGINT(11))
  priority: number

  @Default(200)
  @Column
  status: number

  @ForeignKey(() => User)
  @Column
  creatorId: number

  @ForeignKey(() => User)
  @Column
  lockerId: number

  @ForeignKey(() => Module)
  @Column
  moduleId: number

  @ForeignKey(() => Repository)
  @Column
  repositoryId: number

  @BelongsTo(() => User, 'creatorId')
  creator: User

  @BelongsTo(() => User, 'lockerId')
  locker: User

  @BelongsTo(() => Module, 'moduleId')
  module: Module

  @BelongsTo(() => Repository, 'repositoryId')
  repository: Repository

  @HasMany(() => Property, 'interfaceId')
  properties: Property[]

}

