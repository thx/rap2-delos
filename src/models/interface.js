const Sequelize = require('sequelize')
const sequelize = require('./sequelize')
const { id } = require('./helper')
const methods = ['GET', 'POST', 'PUT', 'DELETE']
module.exports = sequelize.define('interface', {
  id,
  name: { type: Sequelize.STRING(256), allowNull: false, comment: '接口名称' },
  url: { type: Sequelize.STRING(256), allowNull: false, comment: '接口地址' },
  method: { type: Sequelize.ENUM(...methods), allowNull: false, comment: '接口类型' },
  description: { type: Sequelize.TEXT, allowNull: true, comment: '接口描述' },
  // DONE 2.2 支持接口排序
  priority: { type: Sequelize.BIGINT(11).UNSIGNED, allowNull: false, defaultValue: 1, comment: '接口优先级' }
}, {
  paranoid: true,
  comment: '接口'
})
