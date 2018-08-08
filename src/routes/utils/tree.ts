import { Property } from "../../models";
import * as _ from 'underscore'
const vm = require('vm')
import * as Mock from 'mockjs'
const { RE_KEY } = require('mockjs/src/mock/constant')


export default class Tree {

  public static ArrayToTree(list: Property[]) {
    let result: any = {
      name: 'root',
      children: [],
      depth: 0,
    }

    let mapped: any = {}
    list.forEach(item => { mapped[item.id] = item })

    function _parseChildren(parentId: any, children: any, depth: any) {
      for (let id in mapped) {
        let item = mapped[id]
        if (typeof parentId === 'function' ? parentId(item.parentId) : item.parentId === parentId) {
          children.push(item)
          item.depth = depth + 1
          item.children = _parseChildren(item.id, [], item.depth)
        }
      }
      return children
    }

    _parseChildren(
      (parentId: number) => {
        // 忽略 parentId 为 0 的根属性（历史遗留），现为 -1
        if (parentId === -1) return true
        return false
      },
      result.children,
      result.depth,
    )

    return result
  }

  // TODO 2.x 和前端重复了
  public static TreeToTemplate(tree: any) {
    function parse(item: any, result: any) {
      let rule = item.rule ? ('|' + item.rule) : ''
      let value = item.value
      switch (item.type) {
        case 'String':
          result[item.name + rule] = item.value
          break
        case 'Number':
          if (value === '') value = 1
          let parsed = parseFloat(value)
          if (!isNaN(parsed)) value = parsed
          result[item.name + rule] = value
          break
        case 'Boolean':
          if (value === 'true') value = true
          if (value === 'false') value = false
          if (value === '0') value = false
          value = !!value
          result[item.name + rule] = value
          break
        case 'Function':
        case 'RegExp':
          try {
            result[item.name + rule] = eval('(' + item.value + ')') // eslint-disable-line no-eval
          } catch (e) {
            console.warn(`TreeToTemplate ${e.message}: ${item.type} { ${item.name}${rule}: ${item.value} }`) // TODO 2.2 怎么消除异常值？
            result[item.name + rule] = item.value
          }
          break
        case 'Object':
          if (item.value) {
            try {
              result[item.name + rule] = eval(`(${item.value})`) // eslint-disable-line no-eval
            } catch (e) {
              result[item.name + rule] = item.value
            }
          } else {
            result[item.name + rule] = {}
            item.children.forEach((child: any) => {
              parse(child, result[item.name + rule])
            })
          }
          break
        case 'Array':
          if (item.value) {
            try {
              result[item.name + rule] = eval(`(${item.value})`) // eslint-disable-line no-eval
            } catch (e) {
              result[item.name + rule] = item.value
            }
          } else {
            result[item.name + rule] = item.children.length ? [{}] : []
            item.children.forEach((child: any) => {
              parse(child, result[item.name + rule][0])
            })
          }
          break
      }
    }
    let result = {}
    tree.children.forEach((child: any) => {
      parse(child, result)
    })
    return result
  }

  public static TemplateToData(template: any) {
    // 数据模板 template 中可能含有攻击代码，例如死循环，所以在沙箱中生成最终数据
    // https://nodejs.org/dist/latest-v7.x/docs/api/vm.html
    const sandbox = { Mock, template, data: {} }
    const script = new vm.Script('data = Mock.mock(template)')
    const context = new vm.createContext(sandbox) // eslint-disable-line new-cap
    try {
      script.runInContext(context, { timeout: 1000 }) // 每次 Mock.mock() 最多执行 1s
      // DONE 2.1 __root__
      let data: any = sandbox.data
      let keys = Object.keys(data)
      if (keys.length === 1 && keys[0] === '__root__') data = data.__root__
      return data
    } catch (err) {
      console.error(err)
      return {}
    }
  }

  public static ArrayToTreeToTemplate(list: Property[]) {
    let tree = Tree.ArrayToTree(list)
    let template = Tree.TreeToTemplate(tree)
    return template
  }

  public static ArrayToTreeToTemplateToData(list: Property[], extra?: any) {
    let tree = Tree.ArrayToTree(list)
    let template: { [key: string]: any } = Tree.TreeToTemplate(tree)
    let data
    if (extra) {
      // DONE 2.2 支持引用请求参数
      let keys = Object.keys(template).map(item => item.replace(RE_KEY, '$1'))
      let extraKeys = _.difference(Object.keys(extra), keys)
      let scopedData = Tree.TemplateToData(
        Object.assign({}, _.pick(extra, extraKeys), template),
      )
      for (const key in scopedData) {
        if (!scopedData.hasOwnProperty(key)) continue
        let data = scopedData[key]
        for (const eKey in extra) {
          if (!extra.hasOwnProperty(eKey)) continue
          const pattern = new RegExp(`\\$${eKey}\\$`, 'g')
          if (data && pattern.test(data)) {
            data = scopedData[key] = data.replace(pattern, extra[eKey])
          }
        }
      }
      data = _.pick(scopedData, keys)
    } else {
      data = Tree.TemplateToData(template)
    }

    return data
  }

  public static ArrayToTreeToTemplateToJSONSchema(list: Property[]) {
    let tree = Tree.ArrayToTree(list)
    let template = Tree.TreeToTemplate(tree)
    let schema = Mock.toJSONSchema(template)
    return schema
  }

  // TODO 2.2 执行 JSON.stringify() 序列化时会丢失正则和函数。需要转为字符串或者函数。
  // X Function.protytype.toJSON = Function.protytype.toString
  // X RegExp.protytype.toJSON = RegExp.protytype.toString
  public static stringifyWithFunctonAndRegExp(json: object) {
    return JSON.stringify(json, (k, v) => {
      k
      if (typeof v === 'function') return v.toString()
      if (v !== undefined && v !== null && v.exec) return v.toString()
      else return v
    }, 2)
  }

}
