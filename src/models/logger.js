const Sequelize = require('sequelize')
const sequelize = require('./sequelize')
const { id } = require('./helper')
const types = ['create', 'update', 'delete', 'lock', 'unlock', 'join', 'exit']
// DONE 2.3 需要加 creator 吗？Xxx 把 Xxx 加入了 仓库Xxx 或 团队Xxx。
module.exports = sequelize.define('logger', {
  id,
  type: { type: Sequelize.ENUM(...types), allowNull: false, comment: '操作类型' },
  creatorId: { type: Sequelize.BIGINT(11).UNSIGNED, allowNull: true, comment: '创建者' },
  userId: { type: Sequelize.BIGINT(11).UNSIGNED, allowNull: false, comment: '涉及用户' },
  organizationId: { type: Sequelize.BIGINT(11).UNSIGNED, allowNull: true, comment: '涉及组织' },
  repositoryId: { type: Sequelize.BIGINT(11).UNSIGNED, allowNull: true, comment: '涉及仓库' },
  moduleId: { type: Sequelize.BIGINT(11).UNSIGNED, allowNull: true, comment: '涉及模块' },
  interfaceId: { type: Sequelize.BIGINT(11).UNSIGNED, allowNull: true, comment: '涉及接口' }
}, {
  paranoid: true,
  comment: '操作日志'
})
