import { Table, Column, Model, AutoIncrement, PrimaryKey, DataType, ForeignKey } from 'sequelize-typescript'
import { Repository } from '../'


@Table({ paranoid: true, freezeTableName: false, timestamps: false, tableName: 'foreign_room'})
export default class Room extends Model<Room> {

  @AutoIncrement
  @PrimaryKey
  @Column
  id: number

  @ForeignKey(() => Repository)
  @Column({type: DataType.BIGINT, comment: 'rap中的项目id'})
  repositoryId: number

  @Column({type: DataType.BIGINT, comment: 'room中的项目id'})
  roomProjectId: number

  @Column({comment: '项目域名'})
  hostname: string
}