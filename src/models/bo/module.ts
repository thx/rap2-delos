import { Table, Column, Model, HasMany, AutoIncrement, PrimaryKey, AllowNull, DataType, Default, BelongsTo, ForeignKey, BeforeCreate, BeforeUpdate, BeforeDelete, BeforeBulkCreate, BeforeBulkDelete, BeforeBulkUpdate } from 'sequelize-typescript'
import { User, Repository, Interface } from '../'
import RedisService, { CACHE_KEY } from '../../service/redis';

@Table({ paranoid: true, freezeTableName: false, timestamps: true })
export default class Module extends Model<Module> {
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
      const mod = await Module.findById(id)
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
  @Column(DataType.BIGINT(11))
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