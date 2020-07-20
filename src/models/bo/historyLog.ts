import { Table, Column, Model, AutoIncrement, PrimaryKey, DataType, AllowNull, ForeignKey, BelongsTo } from 'sequelize-typescript'
import { ENTITY_TYPE } from '../../routes/utils/const'
import { User } from '../../models'


@Table({ paranoid: true, freezeTableName: false, timestamps: true, tableName: 'history_log' })
export default class HistoryLog extends Model<HistoryLog> {

  @AllowNull(false)
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number

  /**
   * ENTITY_TYPE.INTERFACE: 接口级日志
   * ENTITY_TYPE.REPOSITORY: 接口被删除、模块被移除等超出接口级的日志
   */
  @AllowNull(false)
  @Column({ type: DataType.INTEGER }) // for extension, type to INT, code as enum
  entityType: ENTITY_TYPE

  @AllowNull(false)
  @Column
  entityId: number

  /**
   * 文本日志，支持Markdown，可能存在不同版本，以MarkDown输出即可
   */
  @AllowNull(false)
  @Column({ type: DataType.TEXT })
  changeLog: string


  /**
   * 可空，当发现变更较大（删除、修改字段较多、或整个接口的删除时），记录对应实体的Model JSON用于恢复。
   */
  @Column({ type: DataType.TEXT })
  relatedJSONData: string

  @AllowNull(false)
  @ForeignKey(() => User)
  @Column
  userId: number

  @BelongsTo(() => User, 'userId')
  user: User

  jsonDataIsNull?: boolean

}

export const LOG_SEPERATOR = '.|.'
export const LOG_SUB_SEPERATOR = '@|@'

