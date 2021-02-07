import { IConfigOptions } from '../types'

// 先从环境变量取配置
let config: IConfigOptions = {
  version: '2.9.0',
  serve: {
    port: (process.env.SERVE_PORT && parseInt(process.env.SERVE_PORT)) || 8080,
    path: '',
  },
  keys: ["some secret hurr"],
  session: {
    key: 'rap2:sess',
  },
  db: {
    dialect: 'mysql',
    host: process.env.MYSQL_URL || 'localhost',
    port: (process.env.MYSQL_PORT && parseInt(process.env.MYSQL_PORT)) || 3306,
    username: process.env.MYSQL_USERNAME || 'root',
    password: process.env.MYSQL_PASSWD || '',
    database: process.env.MYSQL_SCHEMA || 'rap',
    pool: {
      max: 80,
      min: 0,
      idle: 20000,
      acquire: 20000,
    },
    logging: false,
  },
  redis: {
    host: process.env.REDIS_URL || 'localhost',
    port: (process.env.REDIS_PORT && parseInt(process.env.REDIS_PORT)) || 6379,
    password: process.env.REDIS_PWD || undefined,
  },
  mail: {
    host: process.env.MAIL_HOST ?? 'smtp.aliyun.com',
    port: process.env.MAIL_PORT ?? 465,
    secure: process.env.MAIL_SECURE ?? true,
    auth: {
      user: process.env.MAIL_USER ?? 'rap2org@service.alibaba.com',
      pass: process.env.MAIL_PASS ?? '',
    },
  },
  mailSender: process.env.MAIL_SENDER ?? "rap2org@service.alibaba.com"
}

export default config
