import { IConfigOptions } from '../types'

const config: IConfigOptions = {
  version: 'v2.8.0',
  serve: {
    port: (process.env.SERVE_PORT && parseInt(process.env.SERVE_PORT)) || 8080,
    path: ''
  },
  keys: ['some secret hurr'],
  session: {
    key: 'rap2:sess'
  },
  db: {
    dialect: 'mysql',
    host: process.env.MYSQL_URL ?? 'localhost',
    port: (process.env.MYSQL_PORT && parseInt(process.env.MYSQL_PORT)) || 3306,
    username: process.env.MYSQL_USERNAME ?? 'root',
    password: process.env.MYSQL_PASSWD ?? '',
    database: process.env.MYSQL_SCHEMA ?? 'RAP2_DELOS_APP',
    pool: {
      max: 10,
      min: 0,
      idle: 10000
    },
    logging: false,
    dialectOptions: {
      connectTimeout: 20000
    }
  },
  redis: {},
  mail: {
    host: 'smtp.aliyun.com',
    port: 465,
    secure: true,
    auth: {
      user: 'rap2org@service.alibaba.com',
      pass: ''
    }
  },
  mailSender: 'rap2org@service.alibaba.com'
}

export default config
