import { IConfigOptions } from "../types"

let config: IConfigOptions = {
  version: '2.8.0',
  serve: {
    port: (process.env.SERVE_PORT && parseInt(process.env.SERVE_PORT)) || 8080,
    path: '',
  },
  keys: ['some secret hurr'],
  session: {
    key: 'rap2:sess',
  },
  db: {
    dialect: 'mysql',
    host: process.env.MYSQL_URL || 'localhost',
    port: (process.env.MYSQL_PORT && parseInt(process.env.MYSQL_PORT)) || 3306,
    username: process.env.MYSQL_USERNAME || 'root',
    password: process.env.MYSQL_PASSWD || '',
    database: process.env.MYSQL_SCHEMA || 'RAP2_DELOS_APP_LOCAL',
    pool: {
      max: 5,
      min: 0,
      idle: 10000,
    },
    logging: false
  },
  redis: {},
  mail: {
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    auth: {
      user: '',
      pass: ''
    }
  },
  mailSender: '',
}

export default config