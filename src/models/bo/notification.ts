import { Table, Column, Model, AutoIncrement, PrimaryKey, AllowNull, DataType, Default } from 'sequelize-typescript'

@Table({ paranoid: true, freezeTableName: false, timestamps: true })
export default class Notification extends Model<Notification> {

  @AutoIncrement
  @PrimaryKey
  @Column
  id: number

  @Column({ comment: 'sender' })
  fromId: number

  @AllowNull(false)
  @Column({ comment: 'receiver' })
  toId: number

  @AllowNull(false)
  @Column({ comment: 'msg type' })
  type: string

  @Column(DataType.STRING(128))
  param1: string

  @Column(DataType.STRING(128))
  param2: string

  @Column(DataType.STRING(128))
  param3: string

  @AllowNull(false)
  @Default(false)
  @Column
  readed: boolean
}