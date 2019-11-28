import sequelize from "../models/sequelize"

sequelize
  .sync({
    force: true,
  })
  .then(() => {
    console.log("成功初始化 DB Schema")
    process.exit(0)
  })
  .catch(e => {
    console.log("初始化 DB Schema 中遇到了错误")
    console.log(e)
    process.exit(0)
  })
