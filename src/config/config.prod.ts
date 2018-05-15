import { IConfigOptions } from "../types";

// 先从环境变量取配置
let config: IConfigOptions =  {
    version: '2.3',
    serve: {
        port: (process.env.EXPOSE_PORT && parseInt(process.env.EXPOSE_PORT)) || 8080,
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
        port: (process.env.REDIS_PORT && parseInt(process.env.REDIS_PORT)) || 6379
    }
}

export default config