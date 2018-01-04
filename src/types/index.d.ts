import { PoolOptions } from "sequelize";
import { ISequelizeConfig } from "sequelize-typescript";

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
}