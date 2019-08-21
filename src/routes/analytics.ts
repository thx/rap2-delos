import router from './router'
import Repository from "../models/bo/repository"
import Logger from "../models/bo/logger"
import User from "../models/bo/user"
const moment = require('moment')
const Sequelize = require('sequelize')
const SELECT = { type: Sequelize.QueryTypes.SELECT }
import sequelize from '../models/sequelize'
import { isLoggedIn } from './base'
const YYYY_MM_DD = 'YYYY-MM-DD'

// 最近 30 天新建仓库数
router.get('/app/analytics/repositories/created', isLoggedIn, async (ctx) => {
  let start = moment().startOf('day').subtract(30, 'days').format(YYYY_MM_DD)
  let end = moment().startOf('day').format(YYYY_MM_DD)
  let sql = `
    SELECT
        DATE(createdAt) AS label,
        COUNT(*) as value
    FROM
        ${Repository.getTableName()}
    WHERE
        createdAt >= '${start}' AND createdAt <= '${end}'
    GROUP BY label
    ORDER BY label ASC;
  `
  let result: any = await sequelize.query(sql, SELECT)
  result = result.map((item: any) => ({
    label: moment(item.label).format(YYYY_MM_DD),
    value: item.value,
  }))
  ctx.body = {
    data: result,
  }
})

// 最近 30 天活跃仓库数
router.get('/app/analytics/repositories/updated', isLoggedIn, async (ctx) => {
  let start = moment().startOf('day').subtract(30, 'days').format(YYYY_MM_DD)
  let end = moment().startOf('day').format(YYYY_MM_DD)
  let sql = `
    SELECT
        DATE(updatedAt) AS label,
        COUNT(*) as value
    FROM
        ${Repository.getTableName()}
    WHERE
        updatedAt >= '${start}' AND updatedAt <= '${end}'
    GROUP BY label
    ORDER BY label ASC;
  `
  let result: any = await sequelize.query(sql, SELECT)
  result = result.map((item: any) => ({
    label: moment(item.label).format(YYYY_MM_DD),
    value: item.value,
  }))
  ctx.body = {
    data: result,
  }
})

// 最近 30 天活跃用户
router.get('/app/analytics/users/activation', isLoggedIn, async (ctx) => {
  let start = moment().startOf('day').subtract(30, 'days').format(YYYY_MM_DD)
  let end = moment().startOf('day').format(YYYY_MM_DD)
  let sql = `
    SELECT
        loggers.userId AS userId,
        users.fullname AS fullname,
        COUNT(*) AS value
    FROM
        ${Logger.getTableName()} loggers
            LEFT JOIN
        ${User.getTableName()} users ON (loggers.userId = users.id)
    WHERE
        loggers.updatedAt >= '${start}' AND loggers.updatedat <= '${end}'
    GROUP BY loggers.userId
    ORDER BY value DESC
    LIMIT 10
  `
  let result = await sequelize.query(sql, SELECT)
  ctx.body = {
    data: result,
  }
})

// 最近 30 天活跃仓库
router.get('/app/analytics/repositories/activation', isLoggedIn, async (ctx) => {
  let start = moment().startOf('day').subtract(30, 'days').format(YYYY_MM_DD)
  let end = moment().startOf('day').format(YYYY_MM_DD)
  let sql = `
    SELECT
        loggers.repositoryId AS repositoryId,
        repositories.name,
        COUNT(*) AS value
    FROM
        ${Logger.getTableName()} loggers
    LEFT JOIN
        ${Repository.getTableName()} repositories
        ON (loggers.repositoryId = repositories.id)
    WHERE
        loggers.repositoryId IS NOT NULL
            AND loggers.updatedAt >= '${start}'
            AND loggers.updatedat <= '${end}'
    GROUP BY loggers.repositoryId
    ORDER BY value DESC
    LIMIT 10
  `
  let result = await sequelize.query(sql, SELECT)
  ctx.body = {
    data: result,
  }
})

// TODO 2.3 支持 start、end