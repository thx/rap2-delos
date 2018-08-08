import router from './router'
import { Repository, Interface, Property } from '../models'
import { QueryInclude } from '../models';
import Tree from './utils/tree'
import urlUtils from './utils/url'
import * as querystring from 'querystring'
import { Sequelize } from 'sequelize-typescript';

const attributes: any = { exclude: [] }
const pt = require('node-print').pt
const beautify = require('js-beautify').js_beautify
const Op = Sequelize.Op

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
      response: ${JSON.stringify(itf.response)} }`,
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
    let repository = await Repository.findById(id, {
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

  ctx.type = 'application/x-javascript'
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

  let repository = await Repository.findById(repositoryId)
  let collaborators: Repository[] = (await repository.$get('collaborators')) as Repository[]
  let itf
  // console.log([urlWithoutPrefixSlash, '/' + urlWithoutPrefixSlash, urlWithoutSearch])

  const matchedItfList = await Interface.findAll({
    attributes,
    where: {
      repositoryId: [repositoryId, ...collaborators.map(item => item.id)],
      method,
      url: {
        [Op.like]: `%${urlWithoutPrefixSlash}%`,
      }
    }
  })

  if (matchedItfList) {
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
  }

  if (!itf) {
    // try RESTFul API search...
    let list = await Interface.findAll({
      attributes: ['id', 'url', 'method'],
      where: {
        repositoryId: [repositoryId, ...collaborators.map(item => item.id)],
      },
    })

    let listMatched = []
    for (let item of list) {
      if (urlUtils.urlMatchesPattern(url, item.url)) {
        listMatched.push(item)
      }
    }

    if (listMatched.length > 1) {
      ctx.body = { isOk: false, errMsg: '匹配到多个接口，请修改规则确保接口规则唯一性。 Matched duplicate interfaces, please ensure pattern to be unique.' }
      return
    } else if (listMatched.length === 0) {
      ctx.body = { isOk: false, errMsg: '未匹配到任何接口 No matched interface' }
      return
    } else {
      itf = await Interface.findById(listMatched[0].id)
    }
  }

  let interfaceId = itf.id
  let properties = await Property.findAll({
    attributes,
    where: { interfaceId, scope: 'response' },
  })
  properties = properties.map(item => item.toJSON())

  // DONE 2.2 支持引用请求参数
  let requestProperties = await Property.findAll({
    attributes,
    where: { interfaceId, scope: 'request' },
  })
  requestProperties = requestProperties.map(item => item.toJSON())
  let requestData = Tree.ArrayToTreeToTemplateToData(requestProperties)
  Object.assign(requestData, ctx.query)
  const data = Tree.ArrayToTreeToTemplateToData(properties, requestData)
  ctx.type = 'json'
  ctx.body = JSON.stringify(data, undefined, 2)
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

router.get('/app/mock/data/:interfaceId', async (ctx) => {
  let app: any = ctx.app
  app.counter.mock++
  let { interfaceId } = ctx.params
  let { scope = 'response' } = ctx.query
  let properties = await Property.findAll({
    attributes,
    where: { interfaceId, scope },
  })
  properties = properties.map(item => item.toJSON())
  // pt(properties)

  // DONE 2.2 支持引用请求参数
  let requestProperties = await Property.findAll({
    attributes,
    where: { interfaceId, scope: 'request' },
  })
  requestProperties = requestProperties.map(item => item.toJSON())
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
  let properties = await Property.findAll({
    attributes,
    where: { interfaceId, scope },
  })
  pt(properties.map(item => item.toJSON()))
  properties = properties.map(item => item.toJSON())
  let schema = Tree.ArrayToTreeToTemplateToJSONSchema(properties)
  ctx.type = 'json'
  ctx.body = Tree.stringifyWithFunctonAndRegExp(schema)
})

router.get('/app/mock/tree/:interfaceId', async (ctx) => {
  let app: any = ctx.app
  app.counter.mock++
  let { interfaceId } = ctx.params
  let { scope = 'response' } = ctx.query
  let properties = await Property.findAll({
    attributes,
    where: { interfaceId, scope },
  })
  pt(properties.map(item => item.toJSON()))
  properties = properties.map(item => item.toJSON())
  let tree = Tree.ArrayToTree(properties)
  ctx.type = 'json'
  ctx.body = Tree.stringifyWithFunctonAndRegExp(tree)
})
