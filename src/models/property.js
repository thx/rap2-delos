const Sequelize = require('sequelize')
const sequelize = require('./sequelize')
const { id } = require('./helper')
const SCOPES = ['request', 'response']
const TYPES = ['String', 'Number', 'Boolean', 'Object', 'Array', 'Function', 'RegExp']
module.exports = sequelize.define('property', {
  id,
  scope: { type: Sequelize.ENUM(...SCOPES), allowNull: false, defaultValue: 'response', comment: '属性归属' },
  name: { type: Sequelize.STRING(256), allowNull: false, comment: '属性名称' },
  type: { type: Sequelize.ENUM(...TYPES), allowNull: false, comment: '属性值类型' },
  rule: { type: Sequelize.STRING(128), allowNull: true, comment: '属性值生成规则' },
  value: { type: Sequelize.TEXT, allowNull: true, comment: '属性值' },
  description: { type: Sequelize.TEXT, allowNull: true, comment: '属性描述' },
  parentId: { type: Sequelize.BIGINT(11), allowNull: false, defaultValue: -1, comment: '父属性' },
  priority: { type: Sequelize.BIGINT(11).UNSIGNED, allowNull: false, defaultValue: 1, comment: '接口优先级' }
}, {
  paranoid: true,
  comment: '属性'
})
