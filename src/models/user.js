const Sequelize = require('sequelize')
const sequelize = require('./sequelize')
const { id } = require('./helper')
module.exports = sequelize.define('user', {
  id,
  fullname: { type: Sequelize.STRING(32), allowNull: false, comment: '姓名' },
  password: { type: Sequelize.STRING(32), allowNull: true, comment: '密码' },
  email: { type: Sequelize.STRING(128), allowNull: false, unique: true, comment: '邮箱' }
}, {
  paranoid: true,
  comment: '用户'
})
