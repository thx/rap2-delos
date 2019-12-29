// 补数据 token
import nanoid = require("nanoid");
import sequelize from "../models/sequelize";
import { Repository } from "../models";
const chalk = require("chalk");

sequelize.model(Repository);
Repository.findAll({
  where: {
    token: null
  }
}).then(async rows => {
  await Promise.all(
    rows.map(async repo => {
      if (!repo.token) {
        repo.token = nanoid(32);
        await repo.save();
        console.log(chalk.green(repo.name + "添加了默认token：" + repo.token));
      }
    })
  );
  process.exit(0);
});
