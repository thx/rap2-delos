import { Table, Column, Model, ForeignKey, PrimaryKey } from 'sequelize-typescript'
import { Repository } from '../'

@Table({ freezeTableName: true, timestamps: true, tableName: 'repositories_collaborators' })
export default class RepositoriesCollaborators extends Model<RepositoriesCollaborators> {
    @ForeignKey(() => Repository)
    @PrimaryKey
    @Column
    repositoryId: number

    @ForeignKey(() => Repository)
    @PrimaryKey
    @Column
    collaboratorId: number
}