const Sequelize = require('sequelize')
const sequelize = require('./sequelize')
const { id } = require('./helper')
module.exports = sequelize.define('repository', {
  id,
  name: { type: Sequelize.STRING(256), allowNull: false, comment: '仓库名称' },
  description: { type: Sequelize.TEXT, allowNull: true, comment: '仓库描述' },
  logo: { type: Sequelize.STRING(256), allowNull: true, comment: '仓库标志' },
  visibility: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true, comment: '是否公开' }
}, {
  paranoid: true,
  comment: '仓库'
})
