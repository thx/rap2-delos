// require('colors')
const Sequelize = require('sequelize')
const config = require('../../config')
const chalk = require('chalk')
const now = () => new Date().toISOString().replace(/T/, ' ').replace(/Z/, '')
const logging = process.env.NODE_ENV === 'development'
  ? (sql) => {
    sql = sql.replace('Executing (default): ', '')
    console.log(`${chalk.bold('SQL')} ${now()} ${chalk.gray(sql)}`)
  }
  : console.log

const sequelize = new Sequelize({
  database: config.db.database,
  username: config.db.username,
  password: config.db.password,
  host: config.db.host,
  port: config.db.port,
  dialect: config.db.dialect,
  pool: config.db.pool,
  logging: config.db.logging ? logging : false
})

sequelize.authenticate()
  .then((/* err */) => {
    // console.log('Connection has been established successfully.');
    console.log('----------------------------------------')
    console.log('DATABASE √')
    console.log('    HOST     %s', config.db.host)
    console.log('    PORT     %s', config.db.port)
    console.log('    DATABASE %s', config.db.database)
    console.log('----------------------------------------')
  })
  .catch(err => {
    console.log('Unable to connect to the database:', err)
  })

module.exports = sequelize

// module.exports = {
//   Sequelize,
//   sequelize,
//   id: { type: Sequelize.BIGINT(11).UNSIGNED, primaryKey: true, allowNull: false, autoIncrement: true },
//   attributes: {
//     create_date: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW, comment: '创建时间' },
//     update_date: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW, comment: '更新时间' },
//     delete_date: { type: Sequelize.DATE, allowNull: true, comment: '删除时间' },
//     reserve: { type: Sequelize.STRING, allowNull: true, comment: '备用' }
//   },
//   options: {
//     // freezeTableName: true,
//     // createdAt: 'create_date',
//     // updatedAt: 'update_date',
//     // deletedAt: 'delete_date',
//     paranoid: true
//   },
//   exclude: ['password', 'create_date', 'delete_date', 'reserve'] // 'update_date',
// }
