import { PoolOptions } from "sequelize";
import { ISequelizeConfig } from "sequelize-typescript";
import { RedisOptions } from "koa-redis";

declare interface IConfigOptions {
  version: string,
  serve: {
    port: number
  },
  keys: string[],
  session: {
    key: string
  },
  keycenter?: string | boolean,
  db: ISequelizeConfig
  redis: RedisOptions
}