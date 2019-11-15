import router from './router'
import { Repository, Interface, Property, DefaultVal } from '../models'
import { QueryInclude } from '../models'
import Tree from './utils/tree'
import urlUtils from './utils/url'
import * as querystring from 'querystring'
import * as urlPkg from 'url'
import { Op } from 'sequelize'

const attributes: any = { exclude: [] }
const pt = require('node-print').pt
const beautify = require('js-beautify').js_beautify

// 检测是否存在重复接口，会在返回的插件 JS 中提示。同时也会在编辑器中提示。
const parseDuplicatedInterfaces = (repository: Repository) => {
  let counter: any = {}
  for (let itf of repository.interfaces) {
    let key = `${itf.method} ${itf.url}`
    counter[key] = [...(counter[key] || []), { id: itf.id, method: itf.method, url: itf.url }]
  }
  let duplicated = []
  for (let key in counter) {
    if (counter[key].length > 1) {
      duplicated.push(counter[key])
    }
  }
  return duplicated
}
const generatePlugin = (protocol: any, host: any, repository: Repository) => {
  // DONE 2.3 protocol 错误，应该是 https
  let duplicated = parseDuplicatedInterfaces(repository)
  let editor = `${protocol}://rap2.taobao.org/repository/editor?id=${repository.id}` // [TODO] replaced by cur domain
  let result = `
/**
 * 仓库    #${repository.id} ${repository.name}
 * 在线编辑 ${editor}
 * 仓库数据 ${protocol}://${host}/repository/get?id=${repository.id}
 * 请求地址 ${protocol}://${host}/app/mock/${repository.id}/:method/:url
 *    或者 ${protocol}://${host}/app/mock/template/:interfaceId
 *    或者 ${protocol}://${host}/app/mock/data/:interfaceId
 */
;(function(){
  let repositoryId = ${repository.id}
  let interfaces = [
    ${repository.interfaces.map((itf: Interface) =>
    `{ id: ${itf.id}, name: '${itf.name}', method: '${itf.method}', url: '${itf.url}',
      request: ${JSON.stringify(itf.request)},
      response: ${JSON.stringify(itf.response)} }`
  ).join(',\n    ')}
  ]
  ${duplicated.length ? `console.warn('检测到重复接口，请访问 ${editor} 修复警告！')\n` : ''}
  let RAP = window.RAP || {
    protocol: '${protocol}',
    host: '${host}',
    interfaces: {}
  }
  RAP.interfaces[repositoryId] = interfaces
  window.RAP = RAP
})();`
  return beautify(result, { indent_size: 2 })
}

router.get('/app/plugin/:repositories', async (ctx) => {
  let repositoryIds = new Set<number>(ctx.params.repositories.split(',').map((item: string) => +item).filter((item: any) => item)) // _.uniq() => Set
  let result = []
  for (let id of repositoryIds) {
    let repository = await Repository.findByPk(id, {
      attributes: { exclude: [] },
      include: [
        QueryInclude.Creator,
        QueryInclude.Owner,
        QueryInclude.Locker,
        QueryInclude.Members,
        QueryInclude.Organization,
        QueryInclude.Collaborators,
      ],
    } as any)
    if (!repository) continue
    if (repository.collaborators) {
      repository.collaborators.map(item => {
        repositoryIds.add(item.id)
      })
    }
    repository.interfaces = await Interface.findAll<Interface>({
      attributes: { exclude: [] },
      where: {
        repositoryId: repository.id,
      },
      include: [
        QueryInclude.Properties,
      ],
    } as any)
    repository.interfaces.forEach(itf => {
      itf.request = Tree.ArrayToTreeToTemplate(itf.properties.filter(item => item.scope === 'request'))
      itf.response = Tree.ArrayToTreeToTemplate(itf.properties.filter(item => item.scope === 'response'))
    })
    // 修复 协议总是 http
    // https://lark.alipay.com/login-session/unity-login/xp92ap
    let protocol = ctx.headers['x-client-scheme'] || ctx.protocol
    result.push(generatePlugin(protocol, ctx.host, repository))
  }

  ctx.type = 'application/x-javascript; charset=utf-8'
  ctx.body = result.join('\n')
})

const REG_URL_METHOD = /^\/?(get|post|delete|put)/i

// /app/mock/:repository/:method/:url
// X DONE 2.2 支持 GET POST PUT DELETE 请求
// DONE 2.2 忽略请求地址中的前缀斜杠
// DONE 2.3 支持所有类型的请求，这样从浏览器中发送跨越请求时不需要修改 method
router.all('/app/mock/:repositoryId(\\d+)/:url(.+)', async (ctx) => {
  let app: any = ctx.app
  app.counter.mock++
  let { repositoryId, url } = ctx.params
  let method = ctx.request.method
  repositoryId = +repositoryId
  if (REG_URL_METHOD.test(url)) {
    REG_URL_METHOD.lastIndex = -1
    method = REG_URL_METHOD.exec(url)[1].toUpperCase()
    REG_URL_METHOD.lastIndex = -1
    url = url.replace(REG_URL_METHOD, '')
  }

  let urlWithoutPrefixSlash = /(\/)?(.*)/.exec(url)[2]
  // let urlWithoutSearch
  // try {
  // let urlParts = new URL(url)
  // urlWithoutSearch = `${urlParts.origin}${urlParts.pathname}`
  // } catch (e) {
  // urlWithoutSearch = url
  // }
  // DONE 2.3 腐烂的 KISSY
  // KISSY 1.3.2 会把路径中的 // 替换为 /。在浏览器端拦截跨域请求时，需要 encodeURIComponent(url) 以防止 http:// 被替换为 http:/。但是同时也会把参数一起编码，导致 route 的 url 部分包含了参数。
  // 所以这里重新解析一遍！！！

  let repository = await Repository.findByPk(repositoryId)
  let collaborators: Repository[] = (await repository.$get('collaborators')) as Repository[]
  let itf: Interface

  let matchedItfList = await Interface.findAll({
    attributes,
    where: {
      repositoryId: [repositoryId, ...collaborators.map(item => item.id)],
      method,
      url: {
        [Op.like]: `%${urlWithoutPrefixSlash}%`,
      }
    }
  })

  function getRelativeURLWithoutParams(url: string) {
    if (url.indexOf('http://') > -1) {
      url = url.substring('http://'.length)
    }
    if (url.indexOf('https://') > -1) {
      url = url.substring('https://'.length)
    }
    if (url.indexOf('/') > -1) {
      url = url.substring(url.indexOf('/') + 1)
    }
    if (url.indexOf('?') > -1) {
      url = url.substring(0, url.indexOf('?'))
    }
    return url
  }

  // matching by path
  if (matchedItfList.length > 1) {
    matchedItfList = matchedItfList.filter(x => {
      const urlDoc = getRelativeURLWithoutParams(x.url)
      const urlRequest = urlWithoutPrefixSlash
      return urlDoc === urlRequest
    })
  }

  // matching by params
  if (matchedItfList.length > 1) {
    const params = {
      ...ctx.request.query,
      ...ctx.request.body,
    }
    const paramsKeysCnt = Object.keys(params).length
    matchedItfList = matchedItfList.filter(x => {
      const parsedUrl = urlPkg.parse(x.url)
      const pairs = parsedUrl.query ? parsedUrl.query.split('&').map(x => x.split('=')) : []
      // 接口没有定义参数时看请求是否有参数
      if (pairs.length === 0) {
        return paramsKeysCnt === 0
      }
      // 接口定义参数时看每一项的参数是否一致
      for (const p of pairs) {
        const key = p[0]
        const val = p[1]
        if (params[key] != val) {
          return false
        }
      }
      return true
    })
  }

  // 多个协同仓库的结果优先返回当前仓库的
  if (matchedItfList.length > 1) {
    const currProjMatchedItfList = matchedItfList.filter(x => x.repositoryId === repositoryId)
    // 如果直接存在当前仓库的就当做结果集，否则放弃
    if (currProjMatchedItfList.length > 0) {
      matchedItfList = currProjMatchedItfList
    }
  }


  for (const item of matchedItfList) {
    itf = item
    let url = item.url
    if (url.charAt(0) === '/') {
      url = url.substring(1)
    }
    if (url === urlWithoutPrefixSlash) {
      break
    }
  }

  if (!itf) {
    // try RESTFul API search...
    let list = await Interface.findAll({
      attributes: ['id', 'url', 'method'],
      where: {
        repositoryId: [repositoryId, ...collaborators.map(item => item.id)],
        method,
      }
    })

    let listMatched = []
    let relativeUrl = urlUtils.getRelative(url)

    for (let item of list) {
      let regExp = urlUtils.getUrlPattern(item.url) // 获取地址匹配正则
      if (regExp.test(relativeUrl)) { // 检查地址是否匹配
        let regMatchLength = regExp.exec(relativeUrl).length // 执行地址匹配
        if (listMatched[regMatchLength]) { // 检查匹配地址中，是否具有同group数量的数据
          ctx.body = {
            isOk: false,
            errMsg: "匹配到多个同级别接口，请修改规则确保接口规则唯一性。"
          }
          return
        }
        listMatched[regMatchLength] = item // 写入数据
      }
    }

    let loadDataId = 0
    if (listMatched.length > 1) {
      for (let matchedItem of listMatched) { // 循环匹配内的数据
        if (matchedItem) { // 忽略为空的数据
          loadDataId = matchedItem.id // 设置需查询的id
          break
        }
      }
    } else if (listMatched.length === 0) {
      ctx.body = { isOk: false, errMsg: '未匹配到任何接口，请检查请求类型是否一致。' }
      return
    } else {
      loadDataId = listMatched[0].id
    }

    itf = itf = await Interface.findByPk(loadDataId)
  }

  let interfaceId = itf.id
  let properties = await Property.findAll({
    attributes,
    where: { interfaceId, scope: 'response' },
  })

  // default values override
  const defaultVals = await DefaultVal.findAll({ where: { repositoryId } })
  const defaultValsMap: {[key: string]: DefaultVal} = {}
  for (const dv of defaultVals) {
    defaultValsMap[dv.name] = dv
  }
  for (const p of properties) {
    const dv = defaultValsMap[p.name]
    if (!p.value && !p.rule && dv) {
      p.value = dv.value
      p.rule = dv.rule
    }
  }


  // check required
  if (~['GET', 'POST'].indexOf(method)) {
    let requiredProperties = await Property.findAll({
      attributes,
      where: { interfaceId, scope: 'request', required: true },
    })
    let passed = true
    let pFailed: Property | undefined
    let params = method === 'GET' ? { ...ctx.request.query } : { ...ctx.request.body }
    // http request中head的参数未添加，会造成head中的参数必填勾选后即使header中有值也会检查不通过
    params = Object.assign(params, ctx.request.headers)
    for (const p of requiredProperties) {
      if (typeof params[p.name] === 'undefined') {
        passed = false
        pFailed = p
        break
      }
    }
    if (!passed) {
      ctx.body = {
        isOk: false,
        errMsg: `必选参数${pFailed.name}未传值。 Required parameter ${pFailed.name} has no value.`,
      }
      return
    }
  }

  properties = properties.map((item: any) => item.toJSON())

  // DONE 2.2 支持引用请求参数
  let requestProperties: any = await Property.findAll({
    attributes,
    where: { interfaceId, scope: 'request' },
  })
  requestProperties = requestProperties.map((item: any) => item.toJSON())
  let requestData = Tree.ArrayToTreeToTemplateToData(requestProperties)
  Object.assign(requestData, { ...ctx.params, ...ctx.query, ...ctx.body })
  let data = Tree.ArrayToTreeToTemplateToData(properties, requestData)
  if (data.__root__) {
    data = data.__root__
  }
  ctx.type = 'json'
  ctx.status = itf.status
  ctx.body = JSON.stringify(data, undefined, 2)
  const Location = data.Location
  if (Location && itf.status === 301) {
    ctx.redirect(Location)
    return
  }
  if (itf && itf.url.indexOf('[callback]=') > -1) {
    const query = querystring.parse(itf.url.substring(itf.url.indexOf('?') + 1))
    const cbName = query['[callback]']
    const cbVal = ctx.request.query[`${cbName}`]
    if (cbVal) {
      let body = typeof ctx.body === 'object' ? JSON.stringify(ctx.body, undefined, 2) : ctx.body
      ctx.type = 'application/x-javascript'
      ctx.body = cbVal + '(' + body + ')'
    }
  }
})

// DONE 2.2 支持获取请求参数的模板、数据、Schema
router.get('/app/mock/template/:interfaceId', async (ctx) => {
  let app: any = ctx.app
  app.counter.mock++
  let { interfaceId } = ctx.params
  let { scope = 'response' } = ctx.query
  let properties = await Property.findAll({
    attributes,
    where: { interfaceId, scope },
  })
  // pt(properties.map(item => item.toJSON()))
  let template = Tree.ArrayToTreeToTemplate(properties)
  ctx.type = 'json'
  ctx.body = Tree.stringifyWithFunctonAndRegExp(template)
  // ctx.body = template
  // ctx.body = JSON.stringify(template, null, 2)
})

router.all('/app/mock/data/:interfaceId', async (ctx) => {
  let app: any = ctx.app
  app.counter.mock++
  let { interfaceId } = ctx.params
  let { scope = 'response' } = ctx.query
  let properties: any = await Property.findAll({
    attributes,
    where: { interfaceId, scope },
  })
  properties = properties.map((item: any) => item.toJSON())
  // pt(properties)

  // DONE 2.2 支持引用请求参数
  let requestProperties: any = await Property.findAll({
    attributes,
    where: { interfaceId, scope: 'request' },
  })
  requestProperties = requestProperties.map((item: any) => item.toJSON())
  let requestData = Tree.ArrayToTreeToTemplateToData(requestProperties)
  Object.assign(requestData, ctx.query)

  let data = Tree.ArrayToTreeToTemplateToData(properties, requestData)
  ctx.type = 'json'
  if (data._root_) {
    data = data._root_
  }
  ctx.body = JSON.stringify(data, undefined, 2)
})

router.get('/app/mock/schema/:interfaceId', async (ctx) => {
  let app: any = ctx.app
  app.counter.mock++
  let { interfaceId } = ctx.params
  let { scope = 'response' } = ctx.query
  let properties: any = await Property.findAll({
    attributes,
    where: { interfaceId, scope },
  })
  pt(properties.map((item: any) => item.toJSON()))
  properties = properties.map((item: any) => item.toJSON())
  let schema = Tree.ArrayToTreeToTemplateToJSONSchema(properties)
  ctx.type = 'json'
  ctx.body = Tree.stringifyWithFunctonAndRegExp(schema)
})

router.get('/app/mock/tree/:interfaceId', async (ctx) => {
  let app: any = ctx.app
  app.counter.mock++
  let { interfaceId } = ctx.params
  let { scope = 'response' } = ctx.query
  let properties: any = await Property.findAll({
    attributes,
    where: { interfaceId, scope },
  })
  pt(properties.map((item: any) => item.toJSON()))
  properties = properties.map((item: any) => item.toJSON())
  let tree = Tree.ArrayToTree(properties)
  ctx.type = 'json'
  ctx.body = Tree.stringifyWithFunctonAndRegExp(tree)
})
