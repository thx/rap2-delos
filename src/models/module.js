const Sequelize = require('sequelize')
const sequelize = require('./sequelize')
const { id } = require('./helper')
module.exports = sequelize.define('module', {
  id,
  name: { type: Sequelize.STRING(256), allowNull: false, comment: '模块名称' },
  description: { type: Sequelize.TEXT, comment: '模块描述' },
  priority: { type: Sequelize.BIGINT(11).UNSIGNED, allowNull: false, defaultValue: 1, comment: '接口优先级' }
}, {
  paranoid: true,
  comment: '模块'
})
