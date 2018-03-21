import {  Table, Column, Model,  AutoIncrement, PrimaryKey, AllowNull, DataType, BelongsTo, ForeignKey } from 'sequelize-typescript'
import { User, Repository, Organization, Module, Interface } from '../'

enum types {
  CREATE = 'create', UPDATE = 'update', DELETE = 'delete',
  LOCK = 'lock', UNLOCK = 'unlock', JOIN = 'join', EXIT = 'exit',
}

@Table({ paranoid: true, freezeTableName: false, timestamps: true })
export default class Logger extends Model<Logger> {
  public static TYPES = types

  @AutoIncrement
  @PrimaryKey
  @Column
  id: number

  @AllowNull(false)
  @Column({
    type: DataType.ENUM(types.CREATE, types.UPDATE, types.DELETE, types.LOCK, types.UNLOCK, types.JOIN, types.EXIT),
    comment: 'operation type',
  })
  type: string

  @ForeignKey(() => User)
  @Column
  creatorId: number

  @AllowNull(false)
  @ForeignKey(() => User)
  @Column
  userId: number

  @ForeignKey(() => Organization)
  @Column
  organizationId: number

  @ForeignKey(() => Repository)
  @Column
  repositoryId: number

  @ForeignKey(() => Module)
  @Column
  moduleId: number

  @ForeignKey(() => Interface)
  @Column
  interfaceId: number

  @BelongsTo(() => User, 'creatorId')
  creator: User

  @BelongsTo(() => User, 'userId')
  user: User

  @BelongsTo(() => Repository, 'repositoryId')
  repository: Repository

  @BelongsTo(() => Organization, 'organizationId')
  organization: Organization

  @BelongsTo(() => Module, 'moduleId')
  module: Module

  @BelongsTo(() => Interface, 'interfaceId')
  interface: Interface

}