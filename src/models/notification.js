const Sequelize = require('sequelize')
const sequelize = require('./sequelize')
const { id } = require('./helper')
module.exports = sequelize.define('notification', {
  id,
  fromId: { type: Sequelize.BIGINT(11), allowNull: true, comment: '发送者' },
  toId: { type: Sequelize.BIGINT(11), allowNull: false, comment: '接受者' },
  type: { type: Sequelize.STRING(128), allowNull: false, comment: '消息类型' },
  param1: { type: Sequelize.STRING(128), allowNull: true, comment: '参数1' },
  param2: { type: Sequelize.STRING(128), allowNull: true, comment: '参数2' },
  param3: { type: Sequelize.STRING(128), allowNull: true, comment: '参数3' },
  readed: { type: Sequelize.BOOLEAN, allowNull: false, defautValue: false, comment: '是否已读' }
}, {
  paranoid: true,
  comment: '消息'
})
