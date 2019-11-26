import { spawnSync } from 'child_process'

export default function pandoc(from: string, to: string, ...args: string[]) {
  const option = ['-f', from, '-t', to].concat(args)
  return function converter(input: any) {
    let pandoc
    input = Buffer.from(input)
    try {
      pandoc = spawnSync('pandoc', option, { input, timeout: 20000 })
    } catch (err) {
      console.error(err)
      console.error(pandoc.stderr)
    }
    if (pandoc.stderr && pandoc.stderr.length) {
      console.error(pandoc.output[2])
      throw new Error(pandoc.output[2].toString())
    }
    return pandoc.stdout
  }
}