import { Sequelize, Table, Column, Model, HasMany, AutoIncrement, PrimaryKey, AllowNull, DataType, Default, BelongsTo, BelongsToMany, ForeignKey } from 'sequelize-typescript'
import { User, Repository } from './index'

@Table({ paranoid: true, freezeTableName: false, timestamps: true })
export class Organization extends Model<Organization> {

  @AutoIncrement
  @PrimaryKey
  @Column
  id: number

  @AllowNull(false)
  @Column(DataType.STRING(256))
  name: string

  @Column(DataType.TEXT)
  description: string

  @Column(DataType.STRING(256))
  logo: string

  @AllowNull(false)
  @Default(true)
  @Column({ comment: 'true:public, false:private' })
  visibility: boolean

  @ForeignKey(() => User)
  @Column
  creatorId: number

  @ForeignKey(() => User)
  @Column
  ownerId: number

  @BelongsTo(() => User, 'creatorId')
  creator: User

  @BelongsTo(() => User, 'ownerId')
  owner: User

  @BelongsToMany(() => User, 'organizations_members', 'organizationId', 'userId')
  members: User[]

  @HasMany(() => Repository, 'organizationId')
  repositories: Repository[]
}