import { Sequelize } from 'sequelize-typescript'
import { Interface, Logger, Module, Notification, Organization, Property, User, Repository } from './index'
import config from '../config'

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
  dialect: config.db.dialect,
  username: config.db.username,
  password: config.db.password,
  host: config.db.host,
  port: config.db.port,
  pool: config.db.pool,
  logging: config.db.logging ? logging : false
})

sequelize.addModels([Interface, Logger, Module, Notification, Organization, Property, Repository, User])
sequelize.authenticate()
  .then((/* err */) => {

    // initialize hooks
    Organization.hook('afterCreate', async(instance, options) => {
      await Logger.create({
        userId: instance.creatorId,
        type: 'create',
        organizationId: instance.id
      })
    })
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