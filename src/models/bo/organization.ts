import { Table, Column, Model, HasMany, AutoIncrement, PrimaryKey, AllowNull, DataType, Default, BelongsTo, BelongsToMany, ForeignKey, AfterCreate } from 'sequelize-typescript'
import { User, Repository, OrganizationsMembers, Logger } from '../'

@Table({ paranoid: true, freezeTableName: false, timestamps: true })
export default class Organization extends Model<Organization> {


  @AfterCreate
  static async createLog(instance: Organization) {
    await Logger.create({
      userId: instance.creatorId,
      type: 'create',
      organizationId: instance.id
    })
  }

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

  @BelongsToMany(() => User, () => OrganizationsMembers)
  members: User[]

  @HasMany(() => OrganizationsMembers)
  organizationMembersList: OrganizationsMembers[]

  @HasMany(() => Repository, 'organizationId')
  repositories: Repository[]
}
