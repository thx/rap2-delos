import { Repository, Interface, Property, DefaultVal } from '../models'
import { Op } from 'sequelize'
import urlUtils from '../routes/utils/url'
import Tree from '../routes/utils/tree'
import * as urlPkg from 'url'
import * as querystring from 'querystring'

const REG_URL_METHOD = /^\/?(get|post|delete|put)/i
const attributes: any = { exclude: [] }

export class MockService {
  public static async mock(ctx: any, option: { forceVerify: boolean } = { forceVerify: false }) {
    const { forceVerify } = option
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

    let repository = await Repository.findByPk(repositoryId)
    let collaborators: Repository[] = (await repository.$get('collaborators')) as Repository[]
    let itf: Interface

    let matchedItfList = await Interface.findAll({
      attributes,
      where: {
        repositoryId: [repositoryId, ...collaborators.map(item => item.id)],
        ...(forceVerify ? { method } : {}),
        url: {
          [Op.like]: `%${urlWithoutPrefixSlash}%`,
        },
      },
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
        },
      })

      let listMatched = []
      let relativeUrl = urlUtils.getRelative(url)

      for (let item of list) {
        let regExp = urlUtils.getUrlPattern(item.url) // 获取地址匹配正则
        if (regExp.test(relativeUrl)) {
          // 检查地址是否匹配
          let regMatchLength = regExp.exec(relativeUrl).length // 执行地址匹配
          if (listMatched[regMatchLength]) {
            // 检查匹配地址中，是否具有同group数量的数据
            ctx.body = {
              isOk: false,
              errMsg: '匹配到多个同级别接口，请修改规则确保接口规则唯一性。',
            }
            return
          }
          listMatched[regMatchLength] = item // 写入数据
        }
      }

      let loadDataId = 0
      if (listMatched.length > 1) {
        for (let matchedItem of listMatched) {
          // 循环匹配内的数据
          if (matchedItem) {
            // 忽略为空的数据
            loadDataId = matchedItem.id // 设置需查询的id
            break
          }
        }
      } else if (listMatched.length === 0) {
        ctx.body = { isOk: false, errMsg: '未匹配到任何接口，请检查请求类型是否一致。' }
        ctx.status = 404
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
    const defaultValsMap: { [key: string]: DefaultVal } = {}
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
    if (forceVerify && ~['GET', 'POST'].indexOf(method)) {
      let requiredProperties = await Property.findAll({
        attributes,
        where: { interfaceId, scope: 'request', required: true },
      })
      let passed = true
      let pFailed: Property | undefined
      let params = { ...ctx.request.query, ...ctx.request.body }
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
        ctx.set(
          'X-RAP-WARNING',
          `Required parameter ${pFailed.name} has not be passed in.`,
        )
      }
    }

    properties = properties.map((item: any) => item.toJSON())

    // 支持引用请求参数
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
  }
}
