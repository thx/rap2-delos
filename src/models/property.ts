import { Table, Column, Model, AutoIncrement, PrimaryKey, AllowNull, DataType, Default, BelongsTo, ForeignKey } from 'sequelize-typescript'
import { User, Interface, Module, Repository } from './index'

enum SCOPES { REQUEST = 'request', RESPONSE = 'response' }
enum TYPES { STRING = 'String', NUMBER = 'Number', BOOLEAN = 'Boolean', OBJECT = 'Object', ARRAY = 'Array', FUNCTION = 'Function', REGEXP = 'RegExp' }

@Table({ paranoid: true, freezeTableName: false, timestamps: true })
export class Property extends Model<Property> {
  public static TYPES = TYPES
  public static SCOPES = SCOPES

  @AutoIncrement
  @PrimaryKey
  @Column
  id: number

  static attributes: any;


  @AllowNull(false)
  @Default(SCOPES.RESPONSE)
  @Column({
    type: DataType.ENUM(SCOPES.REQUEST, SCOPES.RESPONSE),
    comment: 'property owner'
  })
  scope: string

  @AllowNull(false)
  @Column({
    type: DataType.ENUM(TYPES.STRING, TYPES.NUMBER, TYPES.BOOLEAN, TYPES.OBJECT, TYPES.ARRAY, TYPES.FUNCTION, TYPES.REGEXP),
    comment: 'property type'
  })
  type: string

  @AllowNull(false)
  @Column(DataType.STRING(256))
  name: string

  @Column({ type: DataType.STRING(128), comment: 'property generation rules' })
  rule: string

  @Column({ type: DataType.TEXT, comment: 'value of this property'})
  value: string

  @Column(DataType.TEXT)
  description: string

  @AllowNull(false)
  @Default(-1)
  @Column({ type: DataType.BIGINT(11), comment: 'parent property ID' })
  parentId: number

  @AllowNull(false)
  @Default(1)
  @Column(DataType.BIGINT(11).UNSIGNED)
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

}