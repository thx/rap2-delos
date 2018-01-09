import {  Table, Column, Model,  AutoIncrement, PrimaryKey, AllowNull, DataType, BelongsTo, ForeignKey } from 'sequelize-typescript'
import { User, Repository, Organization, Module, Interface } from './index'

enum types {
  CREATE = 'create', UPDATE = 'update', DELETE = 'delete',
  LOCK = 'lock', UNLOCK = 'unlock', JOIN = 'join', EXIT = 'exit'
}

@Table({ paranoid: true, freezeTableName: false, timestamps: true })
export  class Logger extends Model<Logger> {
  public static TYPES = types

  @AutoIncrement
  @PrimaryKey
  @Column
  id: number

  @AllowNull(false)
  @Column({
    type: DataType.ENUM(types.CREATE, types.UPDATE, types.DELETE, types.LOCK, types.UNLOCK, types.JOIN, types.EXIT),
    comment: 'operation type'
  })
  type: string

  @ForeignKey(() => User)
  @Column(DataType.BIGINT(11).UNSIGNED)
  creatorId: number

  @AllowNull(false)
  @ForeignKey(() => User)
  @Column(DataType.BIGINT(11).UNSIGNED)
  userId: number

  @ForeignKey(() => Organization)
  @Column(DataType.BIGINT(11).UNSIGNED)
  organizationId: number

  @ForeignKey(() => Repository)
  @Column(DataType.BIGINT(11).UNSIGNED)
  repositoryId: number

  @ForeignKey(() => Module)
  @Column(DataType.BIGINT(11).UNSIGNED)
  moduleId: number

  @ForeignKey(() => Interface)
  @Column(DataType.BIGINT(11).UNSIGNED)
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