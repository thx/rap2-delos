import { Table, Column, Model, AutoIncrement, PrimaryKey, AllowNull, DataType, Default, BelongsTo, ForeignKey } from 'sequelize-typescript'
import { User, Interface, Module, Repository } from '../'

export enum SCOPES { REQUEST = 'request', RESPONSE = 'response' }
export enum TYPES { STRING = 'String', NUMBER = 'Number', BOOLEAN = 'Boolean', OBJECT = 'Object', ARRAY = 'Array', FUNCTION = 'Function', REGEXP = 'RegExp', Null = 'Null' }

export enum REQUEST_PARAMS_TYPE {
  HEADERS = 1,
  QUERY_PARAMS = 2,
  BODY_PARAMS = 3,
}

@Table({ paranoid: true, freezeTableName: false, timestamps: true })
export default class Property extends Model<Property> {
  public static TYPES = TYPES
  public static SCOPES = SCOPES

  @AutoIncrement
  @PrimaryKey
  @Column
  id: number

  static attributes: any


  @AllowNull(false)
  @Default(SCOPES.RESPONSE)
  @Column({
    type: DataType.ENUM(SCOPES.REQUEST, SCOPES.RESPONSE),
    comment: 'property owner',
  })
  scope: string

  @AllowNull(false)
  @Column({
    type: DataType.ENUM(TYPES.STRING, TYPES.NUMBER, TYPES.BOOLEAN, TYPES.OBJECT, TYPES.ARRAY, TYPES.FUNCTION, TYPES.REGEXP, TYPES.Null),
    comment: 'property type',
  })
  /** Data Type */
  type: string

  @AllowNull(false)
  @Default(2)
  @Column
  /** request params type (position) */
  pos: number

  @AllowNull(false)
  @Column(DataType.STRING(256))
  name: string

  @Column({ type: DataType.STRING(128), comment: 'property generation rules' })
  rule: string

  @Column({ type: DataType.TEXT, comment: 'value of this property' })
  value: string

  @Column(DataType.TEXT)
  description: string

  @AllowNull(false)
  @Default(-1)
  @Column({ comment: 'parent property ID' })
  parentId: number

  @AllowNull(false)
  @Default(1)
  @Column(DataType.BIGINT())
  priority: number

  @ForeignKey(() => Interface)
  @Column
  interfaceId: number

  @ForeignKey(() => User)
  @Column
  creatorId: number

  @ForeignKey(() => Module)
  @Column
  moduleId: number

  @ForeignKey(() => Repository)
  @Column
  repositoryId: number

  @BelongsTo(() => User, 'creatorId')
  creator: User

  @BelongsTo(() => Interface, 'interfaceId')
  interface: Interface

  @BelongsTo(() => Module, 'moduleId')
  module: Module

  @BelongsTo(() => Repository, 'repositoryId')
  repository: Repository

  @Column
  /** 是否为必填选项 */
  required: boolean

}