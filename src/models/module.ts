import { Table, Column, Model, HasMany, AutoIncrement, PrimaryKey, AllowNull, DataType, Default, BelongsTo, ForeignKey } from 'sequelize-typescript'
import { User, Repository, Interface } from './index'

@Table({ paranoid: true, freezeTableName: false, timestamps: true })
export class Module extends Model<Module> {

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
  @Column(DataType.BIGINT(11).UNSIGNED)
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