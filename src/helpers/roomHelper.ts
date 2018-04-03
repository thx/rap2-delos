const { URL } = require('url')
const http = require('http')
const _ = require('underscore')
const vm = require('vm')

const RULE_NUM_INT = /^(\d+)-(\d+)/
const RULE_NUM_DEC = /\.(\d+)-(\d+)$/

export default class RoomHelper {
  static async requestRoom (path: string, body: string, method = 'get') {
    if (typeof body === 'object') {
      path = path + '?' + RoomHelper.formatKV(body)
    }
    if (path[0] !== '/') {
      path = '/' + path
    }

    const parsedData: any = await new Promise((resolve, reject) => {
      let req = http.request({
        hostname: 'room.daily.taobao.net',
        path,
        method: method.toUpperCase(),
        timeout: 2e3,
      }, (res: any) => {
        const { statusCode } = res

        if (statusCode !== 200) {
          reject(new Error(`Request Failed for ${path}\nStatus Code: ${statusCode}`))
          res.resume()
          return
        }

        res.setEncoding('utf8')
        let rawData = ''
        res.on('data', (chunk: any) => { rawData += chunk })
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(rawData)
            resolve(parsedData)
          } catch (e) {
            reject(e)
          }
        })
      }).on('error', (e: any) => {
        reject(e)
      })
      req.end()
    })
    if (!parsedData || !parsedData.info || !parsedData.info.ok) {
      throw new Error('Error from room remote: ' + parsedData.info.message)
    }

    return (parsedData && parsedData.data && parsedData.data.result) || parsedData.info.message
  }
  static matches (inputUrl: any, inputPath: any) {
    // const parsedUrl = inputUrl;
    let beforeUrl = new URL(inputUrl, 'http://localhost')
    let afterUrl = new URL(inputPath, 'http://localhost')
    return beforeUrl.pathname === afterUrl.pathname
  }
  static generateRules ({ name, type, rule, value }: any): any {
    // see https://github.com/nuysoft/Mock/wiki/Syntax-Specification
    let rules = []
    switch (type) {
      // 被暂时忽略的小分组
      case 'RegExp':
      case 'Function':
      case 'Object':
        return

      case 'Array':
        if (rule !== '+1') {
          return
        }

        let arr
        try {
          let ctx = vm.createContext()
          arr = vm.runInContext(value, ctx, {
            timeout: 1000,
          })
        } catch (err) {
          break
        }

        let set = new Set()
        for (let item in arr) {
          if (!_.isBoolean(item) && typeof item !== 'string' && typeof item !== 'number') {
            continue
          }
          set.add(item.toString().charAt(0))
        }
        for (let i = 'A'.charCodeAt(0), j = 'z'.charCodeAt(0); i < j; i++) {
          if (!set.has(String.fromCharCode(i))) {
            rules.push(encapsulate(String.fromCharCode(i), '数组枚举边界'))
            break
          }
        }

        break

      // 先实现的小分组
      case 'String': {
        if (!RULE_NUM_INT.test(rule)) {
          break
        }
        // 构建长度边界
        RULE_NUM_INT.lastIndex = -1
        let [, intMin, intMax]: any = RULE_NUM_INT.exec(rule)
        intMin = +intMin
        intMax = +intMax
        if (intMin > 0) {
          rules.push(encapsulate(
            'x'.repeat((value.length || 1) * (intMin - 1)),
            '字符串长度下界',
          ))
        }
        if (intMax < Number.MAX_SAFE_INTEGER) {
          rules.push(encapsulate(
            'x'.repeat((value.length || 1) * (intMax + 1)),
            '字符串长度上界',
          ))
        }
        break
      }
      case 'Number': {
        // 构建类型边界
        rules.push(encapsulate('NaN', '数字类型边界'))

        if (!RULE_NUM_INT.test(rule)) {
          break
        }
        RULE_NUM_INT.lastIndex = -1
        let [, intMin, intMax]: any = RULE_NUM_INT.exec(rule)
        intMin = +intMin
        intMax = +intMax

        if (RULE_NUM_DEC.test(rule)) {
          RULE_NUM_DEC.lastIndex = -1
          let [, decMin, decMax]: any = RULE_NUM_INT.exec(rule)
          decMin = +decMin
          decMax = +decMax
          // let int = intMin + Math.round(Math.random() * (intMax - intMin))
          let dec: any = (decMin + Math.round(Math.random() * (decMax - decMin))) * 0.01

          // 构建精度边界 -- 暂缓
          // rules.push(encapsulate(
          //   int + Math.pow(0.1, (decMin - 1)),
          //   '精度下界'
          // ))
          // rules.push(encapsulate(
          //   int + Math.pow(0.1, (decMax + 1)),
          //   '精度上界'
          // ))

          // 构建整数边界
          rules.push(encapsulate(
            dec + intMin - 1,
            '数值下界',
          ))
          rules.push(encapsulate(
            dec + intMax + 1,
            '数值上界',
          ))
        } else {
          // 构建长度边界
          rules.push(encapsulate(
            intMin - 1,
            '数值下界',
          ))
          rules.push(encapsulate(
            intMax + 1,
            '数值上界',
          ))
        }
        break
      }
      case 'Boolean':
        // 构建类型边界
        rules.push(encapsulate('NaN', 'Boolean类型边界'))
        break
    }
    return rules

    function encapsulate (stuff: any, remark: any) {
      let Type = stuff.constructor
      let obj = new Type(stuff)
      Object.defineProperty(obj, '$type', {
        value: '-' + name + '-' + (remark || ''),
      })
      return obj
    }
  }
  static formatKV (obj: any) {
    let str = ''
    for (let key of Object.keys(obj)) {
      str && (str += '&')
      str += key + '=' + encodeURIComponent(obj[key])
    }
    return str
  }
}