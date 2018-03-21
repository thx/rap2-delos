import { Table, Column, Model, HasMany, AutoIncrement, PrimaryKey, AllowNull, DataType, Default, BelongsTo, BelongsToMany, ForeignKey } from 'sequelize-typescript'
import { User, Organization, Module, Interface, RepositoriesCollaborators } from '../'

@Table({ paranoid: true, freezeTableName: false, timestamps: true })
export default class Repository extends Model<Repository> {

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
  ownerId: number

  @ForeignKey(() => Organization)
  @Column
  organizationId: number

  @ForeignKey(() => User)
  @Column
  creatorId: number

  @ForeignKey(() => User)
  @Column
  lockerId: number

  @BelongsTo(() => User, 'creatorId')
  creator: User

  @BelongsTo(() => User, 'ownerId')
  owner: User

  @BelongsTo(() => Organization, 'organizationId')
  organization: Organization

  @BelongsTo(() => User, 'lockerId')
  locker: User

  @BelongsToMany(() => User, 'repositories_members', 'repositoryId', 'userId')
  members: User[]

  @HasMany(() => Module, 'repositoryId')
  modules: Module[]

  @HasMany(() => Module, 'repositoryId')
  interfaces: Interface[]

  @BelongsToMany(() => Repository, () => RepositoriesCollaborators, 'collaboratorId')
  collaborators: Repository[]

  @BelongsToMany(() => Repository, () => RepositoriesCollaborators, 'repositoryId')
  repositories: Repository[]

}