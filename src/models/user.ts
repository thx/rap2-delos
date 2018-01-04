import { Sequelize, Table, Column, Model, HasMany, AutoIncrement, PrimaryKey, AllowNull, DataType, Default, Unique, ForeignKey, BelongsToMany } from 'sequelize-typescript'
import { Organization, Repository } from './index'

@Table({ paranoid: true, freezeTableName: false, timestamps: true })
export class User extends Model<User> {

  @AutoIncrement
  @PrimaryKey
  @Column
  id: number

  @AllowNull(false)
  @Column(DataType.STRING(32))
  fullname: string

  @Column(DataType.STRING(32))
  password: string

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING(128))
  email: string

  @HasMany(() => Organization, 'ownerId')
  ownedOrganizations: Organization[]

  @BelongsToMany(() => Organization, 'organizations_members', 'organizationId', 'userId')
  joinedOrganizations: Organization[]

  @HasMany(() => Repository, 'ownerId')
  ownedRepositories: Repository[]

  @BelongsToMany(() => Repository, 'repositories_members', 'userId', 'repositoryId')
  joinedRepositories: Repository[]

}