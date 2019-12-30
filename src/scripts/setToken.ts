// 补数据 token
import nanoid = require("nanoid")
import sequelize from "../models/sequelize"
import { Repository } from "../models"
const chalk = require("chalk");

(async () => {
  sequelize.model(Repository)

  const cnt = await Repository.count({
    where: {
      // tslint:disable-next-line: no-null-keyword
      token: null
    }
  })

  const limit = 500
  const iteration = 1

  console.log(`共有${cnt}条数据`)

  while (true) {
    const rows = await Repository.findAll({
      where: {
        // tslint:disable-next-line: no-null-keyword
        token: null
      },
      limit
    })
    console.log(`正在处理第 ${iteration} 轮, length ${rows.length}`)

    if (rows.length === 0) {
      console.log('全部处理完成')
      break
    }

    await Promise.all(
      rows.map(async repo => {
        if (!repo.token) {
          repo.token = nanoid(32)
          await repo.save()
          console.log(
            chalk.green(repo.name + "添加了默认token：" + repo.token)
          )
        }
      })
    )
  }
  process.exit(0)
})()
