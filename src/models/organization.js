const Sequelize = require('sequelize')
const sequelize = require('./sequelize')
const { id } = require('./helper')
module.exports = sequelize.define('organization', {
  id,
  name: { type: Sequelize.STRING(256), allowNull: false, comment: '团队名称' },
  description: { type: Sequelize.TEXT, allowNull: true, comment: '团队描述' },
  logo: { type: Sequelize.STRING(256), allowNull: true, comment: '团队标志' },
  visibility: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true, comment: '是否公开' }
}, {
  paranoid: true,
  comment: '团队'
})
