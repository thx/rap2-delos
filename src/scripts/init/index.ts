import { init, after } from './delos'
/**
 * initialize database
 */
async function main () {
  await init()
  await after()
}

main()

export {}
