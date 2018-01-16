import { Table, Column, Model, HasMany, AutoIncrement, PrimaryKey, AllowNull, DataType, Unique, BelongsToMany } from 'sequelize-typescript'
import { Organization, Repository, OrganizationsMembers, RepositoriesMembers } from '../'

@Table({ paranoid: true, freezeTableName: false, timestamps: true })
export default class User extends Model<User> {

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

  @BelongsToMany(() => Organization, () => OrganizationsMembers)
  joinedOrganizations: Organization[]

  @HasMany(() => Repository, 'ownerId')
  ownedRepositories: Repository[]

  @BelongsToMany(() => Repository, () => RepositoriesMembers)
  joinedRepositories: Repository[]

}