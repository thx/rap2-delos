const Sequelize = require('sequelize')
export let Helper =  {
  id: { type: Sequelize.BIGINT(11).UNSIGNED, primaryKey: true, allowNull: false, autoIncrement: true, comment: '唯一标识' },
  include: [],
  exclude: {
    generalities: ['createdAt', 'updatedAt', 'deletedAt', 'reserve']
  }
}
