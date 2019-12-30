// 补数据 token
import nanoid = require("nanoid");
import sequelize from "../models/sequelize";
import { Repository } from "../models";
const chalk = require("chalk");

(async () => {
  sequelize.model(Repository);

  const cnt = await Repository.count({
    where: {
      token: null
    }
  });


  const limit = 500;

  console.log(`共有${cnt}条数据`);


  for (let offset = 0; offset < cnt; offset += limit) {
    console.log(`正在处理offset ${offset}, limit ${limit}`);
    const rows = await Repository.findAll({
      where: {
        token: null
      },
      limit,
      offset
    });
    await Promise.all(
      rows.map(async repo => {
        if (!repo.token) {
          repo.token = nanoid(32);
          await repo.save();
          console.log(
            chalk.green(repo.name + "添加了默认token：" + repo.token)
          );
        }
      })
    );
  }
  process.exit(0)
})();
