import { init, after } from './delos'
/**
 * initialize database
 */
export async function main () {
  await init()
  console.log('after init')
  await after()
  console.log('after after')
}

main().then(() => {
  console.log('Run create-db finished successfully.')
  process.exit(0)
})