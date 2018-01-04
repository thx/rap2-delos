import router from './router'
const moment = require('moment')
const Sequelize = require('sequelize')
const SELECT = { type: Sequelize.QueryTypes.SELECT }
const sequelize = require('../models/sequelize')
const YYYY_MM_DD = 'YYYY-MM-DD'

// 最近 30 天新建仓库数
router.get('/app/analytics/repositories/created', async (ctx, next) => {
  let start = moment().startOf('day').subtract(30, 'days').format(YYYY_MM_DD)
  let end = moment().startOf('day').format(YYYY_MM_DD)
  let sql = `
    SELECT 
        DATE(createdAt) AS label, 
        COUNT(*) as value
    FROM
        RAP2_DELOS_APP.repositories
    WHERE
        createdAt >= '${start}' AND createdAt <= '${end}'
    GROUP BY label
    ORDER BY label ASC;
  `
  let result = await sequelize.query(sql, SELECT)
  result = result.map(item => ({
    label: moment(item.label).format(YYYY_MM_DD),
    value: item.value
  }))
  ctx.body = {
    data: result
  }
})

// 最近 30 天活跃仓库数
router.get('/app/analytics/repositories/updated', async (ctx, next) => {
  let start = moment().startOf('day').subtract(30, 'days').format(YYYY_MM_DD)
  let end = moment().startOf('day').format(YYYY_MM_DD)
  let sql = `
    SELECT 
        DATE(updatedAt) AS label, 
        COUNT(*) as value
    FROM
        RAP2_DELOS_APP.repositories
    WHERE
        updatedAt >= '${start}' AND updatedAt <= '${end}'
    GROUP BY label
    ORDER BY label ASC;
  `
  let result = await sequelize.query(sql, SELECT)
  result = result.map(item => ({
    label: moment(item.label).format(YYYY_MM_DD),
    value: item.value
  }))
  ctx.body = {
    data: result
  }
})

// 最近 30 天活跃用户
router.get('/app/analytics/users/activation', async (ctx, next) => {
  let start = moment().startOf('day').subtract(30, 'days').format(YYYY_MM_DD)
  let end = moment().startOf('day').format(YYYY_MM_DD)
  let sql = `
    SELECT 
        loggers.userId AS userId,
        users.fullname AS fullname,
        COUNT(*) AS value
    FROM
        loggers
            LEFT JOIN
        (users) ON (loggers.userId = users.id)
    WHERE
        loggers.updatedAt >= '${start}' AND loggers.updatedat <= '${end}'
    GROUP BY loggers.userId
    ORDER BY value DESC
    LIMIT 10
  `
  let result = await sequelize.query(sql, SELECT)
  ctx.body = {
    data: result
  }
})

// 最近 30 天活跃仓库
router.get('/app/analytics/repositories/activation', async (ctx, next) => {
  let start = moment().startOf('day').subtract(30, 'days').format(YYYY_MM_DD)
  let end = moment().startOf('day').format(YYYY_MM_DD)
  let sql = `
    SELECT 
        loggers.repositoryId AS repositoryId,
        repositories.name,
        COUNT(*) AS value
    FROM
        loggers
            LEFT JOIN
        (repositories) ON (loggers.repositoryId = repositories.id)
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
    data: result
  }
})

// TODO 2.3 支持 start、end