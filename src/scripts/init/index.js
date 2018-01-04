const { init, after } = require('./delos')
/**
 * initialize database
 */
async function main () {
  await init()
  await after()
}

main()
