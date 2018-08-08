import { IConfigOptions } from "../types";

let config: IConfigOptions = {
  version: '2.3',
  serve: {
    port: 8080,
  },
  keys: ['some secret hurr'],
  session: {
    key: 'rap2:sess',
  },
  db: {
    dialect: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: '',
    database: 'RAP2_DELOS_APP',
    pool: {
      max: 5,
      min: 0,
      idle: 10000,
    },
    logging: false,
  },
  redis: {
    // isRedisCluster: true,
    // nodes: [{
    //   port: 6379,
    //   host: '*.*.*',
    // },
    // {
    //   port: 6380,
    //   host: '*.*.*',
    // },
    // {
    //   port: 6381,
    //   host: '*.*.*',
    // }],
    // redisOptions: {
    //   password: '*',
    // }
  }
}

export default config
