import { Table, Column, Model, ForeignKey, PrimaryKey } from 'sequelize-typescript'
import { User,  Organization } from '../'

@Table({ freezeTableName: true, timestamps: true, tableName: 'organizations_members' })
export default class OrganizationsMembers extends Model<OrganizationsMembers> {
    @ForeignKey(() => User)
    @PrimaryKey
    @Column
    userId: number

    @ForeignKey(() => Organization)
    @PrimaryKey
    @Column
    organizationId: number
}