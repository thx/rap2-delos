import sequelize from '../models/sequelize'

export async function main() {
  await sequelize.sync({
    alter: true,
    logging: true
  })
}

main().then(() => {
  console.log("成功升级 DB Schema")
  process.exit(0)
})
