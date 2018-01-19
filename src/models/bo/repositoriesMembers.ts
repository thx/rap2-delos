import { Table, Column, Model, ForeignKey, PrimaryKey } from 'sequelize-typescript'
import { Repository, User } from '../'

@Table({ freezeTableName: true, timestamps: false, tableName: 'repositories_members' })
export default class RepositoriesMembers extends Model<RepositoriesMembers> {
  @ForeignKey(() => User)
  @PrimaryKey
  @Column
  userId: number

  @ForeignKey(() => Repository)
  @PrimaryKey
  @Column
  repositoryId: number
}