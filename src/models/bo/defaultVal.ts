import { Table, Column, Model, AutoIncrement, PrimaryKey, ForeignKey } from 'sequelize-typescript'
import { Repository } from '../../models'


@Table({ paranoid: true, freezeTableName: false, timestamps: true, tableName: 'default_val' })
export default class DefaultVal extends Model<DefaultVal> {

  @PrimaryKey
  @AutoIncrement
  @Column
  id: number

  @Column
  name: string

  @Column
  rule: string

  @Column
  value: string

  @ForeignKey(() => Repository)
  @Column
  repositoryId: number

}

