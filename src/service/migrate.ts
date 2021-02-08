import { Repository, Module, Interface, Property, User, QueryInclude } from '../models'
import { SCOPES } from '../models/bo/property'
import Tree from '../routes/utils/tree'
import * as JSON5 from 'json5'
import * as querystring from 'querystring'
import * as rp from 'request-promise'
import { Op } from 'sequelize'
import RedisService, { CACHE_KEY } from './redis'
import MailService from './mail'
import * as md5 from 'md5'
const isMd5 = require('is-md5')
import * as _ from 'lodash'

const safeEval = require('notevil')

const SWAGGER_VERSION = {
  1: '2.0',
}

/**
 * swagger json结构转化的数组转化为树形结构
 * @param list
 */
const arrayToTree = list => {
  const parseChildren = (list, parent) => {
    list.forEach(item => {
      if (item.parent === parent.id) {
        item.depth = parent.depth + 1
        item.parentName = parent.name
        item.children = item.children || []
        parent.children.push(item)
        parseChildren(list, item)
      }
    })
    return parent
  }
  return parseChildren(list, {
    id: 'root',
    name: 'root',
    children: [],
    depth: -1,
    parent: -1,
  })
}

/**
 * swagger json结构转化的数组转化的树形结构转化为数组
 * @param tree
 */
const treeToArray = (tree: any) => {
  const parseChildren = (parent: any, result: any) => {
    if (!parent.children) {
      return result
    }
    parent.children.forEach((item: any) => {
      result.push(item)
      parseChildren(item, result)
      delete item.children
    })
    return result
  }
  return parseChildren(tree, [])
}

/**
 * 接口属性-数组结构转化为树形结构
 * @param list
 */
const arrayToTreeProperties = (list: any) => {
  const parseChildren = (list: any, parent: any) => {
    list.forEach((item: any) => {
      if (item.parentId === parent.id) {
        item.depth = parent.depth + 1
        item.children = item.children || []
        parent.children.push(item)
        parseChildren(list, item)
      }
    })
    return parent
  }
  return parseChildren(list, {
    id: -1,
    name: 'root',
    children: [],
    depth: -1,
  })
}

/**
 * 参数请求类型枚举
 */
const REQUEST_TYPE_POS = {
  path: 2,
  query: 2,
  header: 1,
  formData: 3,
  body: 3,
}

let checkSwaggerResult = []
let changeTip = '' // 变更信息

/**
 * Swagger JSON 参数递归处理成数组
 * @param parameters 参数列表数组
 * @param parent 父级id
 * @param parentName 父级属性name
 * @param depth parameters list 中每个属性的深度
 * @param result swagger转化为数组结果 -- 对swagger参数处理结果
 * @param definitions swagger $ref definitions， 额外传递过来的swagger的definitions数据, 非计算核心算法
 * @param scope 参数类型 -- 【暂不用】用于参数校验后提示
 * @param apiInfo 接口信息 -- 【暂不用】用于参数校验后提示
 */
const parse = (parameters, parent, parentName, depth, result, definitions, scope, apiInfo) => {
  for (let key = 0, len = parameters.length; key < len; key++) {
    const param = parameters[key]

    if (!param.$ref && !(param.items || {}).$ref) {
      // 非对象或者数组的基础类型
      result.push({
        ...param,
        parent,
        parentName,
        depth,
        id: `${parent}-${key}`,
      })
    } else {
      // 数组类型或者对象类型
      let paramType = ''
      if (param.items) {
        paramType = 'array'
      } else {
        paramType = 'object'
      }

      result.push({
        ...param,
        parent,
        parentName,
        depth,
        id: `${parent}-${key}`,
        type: paramType,
      })

      let refName
      if (!param.items) {
        // 对象
        refName = param.$ref.split('#/definitions/')[1]
        delete result.find(item => item.id === `${parent}-${key}`)['$ref']
      }
      if (param.items) {
        // 数组
        refName = param.items.$ref.split('#/definitions/')[1]
        delete result.find(item => item.id === `${parent}-${key}`).items
      }

      const ref = definitions[refName]
      if (ref && ref.properties) {
        const properties = ref.properties
        const list = []

        for (const key in properties) {
          // swagger文档中对definition定义属性又引用自身的情况处理-死循环
          if (properties[key].$ref) {
            if (properties[key].$ref.split('#/definitions/')[1] === refName) {
              // delete properties[key].$ref
              list.push({
                name: key,
                parentName: param.name,
                depth: depth + 1,
                ...properties[key],
                $ref: null,
                type: 'object',
                in: param.in,
                required: (ref.required || []).indexOf(key) >= 0,
                description: `【递归父级属性】${properties[key].description || ''}`,
              })
            } else {
              list.push({
                name: key,
                parentName: param.name,
                depth: depth + 1,
                ...properties[key],
                in: param.in,
                required: (ref.required || []).indexOf(key) >= 0,
              })
            }
          } else if ((properties[key].items || {}).$ref) {
            if (properties[key].items.$ref.split('#/definitions/')[1] === refName) {
              // delete properties[key].items.$ref
              list.push({
                name: key,
                parentName: param.name,
                depth: depth + 1,
                ...properties[key],
                type: 'array',
                items: null,
                $ref: null,
                in: param.in,
                required: (ref.required || []).indexOf(key) >= 0,
                description: `【递归父级属性】${properties[key].description || ''}`,
              })
            } else {
              list.push({
                name: key,
                parentName: param.name,
                depth: depth + 1,
                ...properties[key],
                in: param.in,
                required: (ref.required || []).indexOf(key) >= 0,
              })
            }
          } else {
            list.push({
              name: key,
              parentName: param.name,
              depth: depth + 1,
              ...properties[key],
              in: param.in, // response 无所谓，不使用但是request 使用
              required: (ref.required || []).indexOf(key) >= 0,
            })
          }
        }
        parse(list, `${parent}-${key}`, param.name, depth + 1, result, definitions, scope, apiInfo)
      }
    }
  }
}

const transformRapParams = p => {
  let rule = '',
    description = '',
    value = p.default || ''

  // 类型转化处理
  let type = p.type || 'string'
  if (type === 'integer') type = 'number'
  type = type[0].toUpperCase() + type.slice(1)

  // 规则属性说明处理
  if (p.type === 'string' && p.minLength && p.maxLength) {
    rule = `${p.minLength}-${p.maxLength}`
    description = `${description}|长度限制: ${p.minLength}-${p.maxLength}`
  } else if (p.type === 'string' && p.minLength && !p.maxLength) {
    rule = `${p.minLength}`
    description = `${description}|长度限制：最小值: ${p.minLength}`
  } else if (p.type === 'string' && !p.minLength && p.maxLength) {
    rule = `${p.required ? '1' : '0'}-${p.maxLength}`
    description = `${description}|长度限制：最大值: ${p.maxLength}`
  }
  if (p.type === 'string' && p.enum && p.enum.length > 0) {
    description = `${description}|枚举值: ${p.enum.join()}`
  }
  if ((p.type === 'integer' || p.type === 'number') && p.minimum && p.maxinum) {
    rule = `${p.minimum}-${p.maxinum}`
    description = `${description}|数据范围: ${p.minimum}-${p.maxinum}`
  }
  if ((p.type === 'integer' || p.type === 'number') && p.minimum && !p.maxinum) {
    rule = `${p.minimum}`
    description = `${description}|数据范围: 最小值：${p.minimum}`
  }
  if ((p.type === 'integer' || p.type === 'number') && !p.minimum && p.maxinum) {
    rule = `${p.required ? '1' : '0'}-${p.maxinum}`
    description = `${description}|数据范围: 最大值：${p.maxinum}`
  }

  // 默认值转化处理
  value = p.default || ''
  if (!p.default && p.type === 'string') value = '@ctitle'
  if (!p.default && (p.type === 'number' || p.type === 'integer')) value = '@integer(0, 100000)'
  if (p.type === 'boolean') {
    value = p.default === true || p.default === false ? p.default.toString() : 'false'
  }
  if (p.enum && (p.enum || []).length > 0) value = p.enum[0]
  if (p.type === 'string' && p.format === 'date-time') value = '@datetime'
  if (p.type === 'string' && p.format === 'date') value = '@date'

  if (p.type === 'array' && p.default) {
    value = typeof p.default === 'object' ? JSON.stringify(p.default) : p.default.toString()
  }
  if (/^function/.test(value)) type = 'Function' // @mock=function(){} => Function
  if (/^\$order/.test(value)) {
    // $order => Array|+1
    type = 'Array'
    rule = '+1'
    let orderArgs = /\$order\((.+)\)/.exec(value)
    if (orderArgs) value = `[${orderArgs[1]}]`
  }

  if (['String', 'Number', 'Boolean', 'Object', 'Array', 'Function', 'RegExp', 'Null'].indexOf(type) === -1) {
    /** File暂时不支持，用Null代替 */
    type = 'Null'
  }

  return {
    type,
    rule,
    description: description.length > 0 ? description.substring(1) : '',
    value,
  }
}

const propertiesUpdateService = async (properties, itfId) => {
  properties = Array.isArray(properties) ? properties : [properties]
  let itf = await Interface.findByPk(itfId)

  let existingProperties = properties.filter((item: any) => !item.memory)
  let result = await Property.destroy({
    where: {
      id: { [Op.notIn]: existingProperties.map((item: any) => item.id) },
      interfaceId: itfId,
    },
  })

  // 更新已存在的属性
  for (let item of existingProperties) {
    let affected = await Property.update(item, {
      where: { id: item.id },
    })
    result += affected[0]
  }
  // 插入新增加的属性
  let newProperties = properties.filter((item: any) => item.memory)
  let memoryIdsMap: any = {}
  for (let item of newProperties) {
    let created = await Property.create(
      Object.assign({}, item, {
        id: undefined,
        parentId: -1,
        priority: item.priority || Date.now(),
      }),
    )
    memoryIdsMap[item.id] = created.id
    item.id = created.id
    result += 1
  }
  // 同步 parentId
  for (let item of newProperties) {
    let parentId = memoryIdsMap[item.parentId] || item.parentId
    await Property.update(
      { parentId },
      {
        where: { id: item.id },
      },
    )
  }
  itf = await Interface.findByPk(itfId, {
    include: (QueryInclude.RepositoryHierarchy as any).include[0].include,
  })
  return {
    data: {
      result,
      properties: itf.properties,
    },
  }
}

const sendMailTemplate = changeTip => {
  let html = MailService.mailNoticeTemp
    .replace('{=TITLE=}', '您相关的接口存在如下变更：(请注意代码是否要调整)')
    .replace(
      '{=CONTENT=}',
      (changeTip.split('<br/>') || [])
        .map(one => {
          return one ? `<li style="margin-bottom: 20px;">${one}</li>` : ''
        })
        .join(''),
    )
  return html
}
export default class MigrateService {
  public static async importRepoFromRAP1ProjectData(
    orgId: number,
    curUserId: number,
    projectData: any,
  ): Promise<boolean> {
    if (!projectData || !projectData.id || !projectData.name) return false
    let pCounter = 1
    let mCounter = 1
    let iCounter = 1
    const repo = await Repository.create({
      name: projectData.name,
      description: projectData.introduction,
      visibility: true,
      ownerId: curUserId,
      creatorId: curUserId,
      organizationId: orgId,
    })
    for (const module of projectData.moduleList) {
      const mod = await Module.create({
        name: module.name,
        description: module.introduction,
        priority: mCounter++,
        creatorId: curUserId,
        repositoryId: repo.id,
      })
      for (const page of module.pageList) {
        for (const action of page.actionList) {
          const itf = await Interface.create({
            moduleId: mod.id,
            name: `${page.name}-${action.name}`,
            description: action.description,
            url: action.requestUrl || '',
            priority: iCounter++,
            creatorId: curUserId,
            repositoryId: repo.id,
            method: getMethodFromRAP1RequestType(+action.requestType),
          })
          for (const p of action.requestParameterList) {
            await processParam(p, SCOPES.REQUEST)
          }
          for (const p of action.responseParameterList) {
            await processParam(p, SCOPES.RESPONSE)
          }
          async function processParam(p: OldParameter, scope: SCOPES, parentId?: number) {
            const RE_REMARK_MOCK = /@mock=(.+)$/
            const ramarkMatchMock = RE_REMARK_MOCK.exec(p.remark)
            const remarkWithoutMock = p.remark.replace(RE_REMARK_MOCK, '')
            const name = p.identifier.split('|')[0]
            let rule = p.identifier.split('|')[1] || ''
            let type = (p.dataType || 'string').split('<')[0] // array<number|string|object|boolean> => Array
            type = type[0].toUpperCase() + type.slice(1) // foo => Foo
            let value = (ramarkMatchMock && ramarkMatchMock[1]) || ''
            if (/^function/.test(value)) type = 'Function' // @mock=function(){} => Function
            if (/^\$order/.test(value)) {
              // $order => Array|+1
              type = 'Array'
              rule = '+1'
              let orderArgs = /\$order\((.+)\)/.exec(value)
              if (orderArgs) value = `[${orderArgs[1]}]`
            }
            let description = []
            if (p.name) description.push(p.name)
            if (p.remark && remarkWithoutMock) description.push(remarkWithoutMock)
            const pCreated = await Property.create({
              scope,
              name,
              rule,
              value,
              type,
              description: `${p.remark}${p.name ? ', ' + p.name : ''}`,
              priority: pCounter++,
              interfaceId: itf.id,
              creatorId: curUserId,
              moduleId: mod.id,
              repositoryId: repo.id,
              parentId: parentId || -1,
            })
            for (const subParam of p.parameterList) {
              processParam(subParam, scope, pCreated.id)
            }
          }
        }
      }
    }
    return true
  }
  public static checkAndFix(): void {
    // console.log('checkAndFix')
    // this.checkPasswordMd5().then()
  }

  static async checkPasswordMd5() {
    console.log('  checkPasswordMd5')
    const users = await User.findAll()
    if (users.length === 0 || isMd5(users[0].password)) {
      console.log('  users empty or md5 check passed')
      return
    }
    for (const user of users) {
      if (!isMd5(user.password)) {
        user.password = md5(md5(user.password))
        await user.save()
        console.log(`handle user ${user.id}`)
      }
    }
  }

  /** RAP1 property */
  public static async importRepoFromRAP1DocUrl(
    orgId: number,
    curUserId: number,
    docUrl: string,
    version: number,
    projectDataJSON: string
  ): Promise<boolean> {
    let result: any = null
    if (version === 1) {
      const { projectId } = querystring.parse(docUrl.substring(docUrl.indexOf('?') + 1))
      let domain = docUrl
      if (domain.indexOf('http') === -1) {
        domain = 'http://' + domain
      }
      domain = domain.substring(0, domain.indexOf('/', domain.indexOf('.')))
      const response = await rp(`${domain}/api/queryRAPModel.do?projectId=${projectId}`, {
        json: false,
      })
      result = JSON.parse(response)

      // result =  unescape(result.modelJSON)
      result = result.modelJSON
      result = safeEval('(' + result + ')')
    } else if (version === 2) {
      result = safeEval('(' + projectDataJSON + ')')
    }
    return await this.importRepoFromRAP1ProjectData(orgId, curUserId, result)
  }

  /** 请求参对象->数组->标准树形对象 @param swagger @param parameters */
  public static async swaggerToModelRequest(
    swagger: SwaggerData,
    parameters: Array<any>,
    method: string,
    apiInfo: any,
  ): Promise<any> {
    let { definitions = {} } = swagger
    const result = []
    definitions = JSON.parse(JSON.stringify(definitions)) // 防止接口之间数据处理相互影响

    if (Array.isArray(parameters) && method === 'get' || method === 'GET') {
      parse(
        parameters.filter(item => item.in !== 'body') || [],
        'root',
        'root',
        0,
        result,
        definitions,
        'request',
        apiInfo,
      )
    } else if (method === 'post' || method === 'POST') {
      let list = [] // 外层处理参数数据结果
      const bodyObj = parameters.find(item => item.in === 'body') // body unique

      if (!bodyObj) list = [...parameters]
      else {
        const { schema } = bodyObj
        if (!schema.$ref) {
          // 没有按照接口规范返回数据结构,默认都是对象
          list = parameters.filter(item => item.in === 'query' || item.in === 'header')
        } else {
          const refName = schema.$ref.split('#/definitions/')[1]
          const ref = definitions[refName]

          if (!ref)
            list = [...parameters.filter(item => item.in === 'query' || item.in === 'header')]
          else {
            const properties = ref.properties || {}
            const bodyParameters = []

            for (const key in properties) {
              bodyParameters.push({
                name: key,
                ...properties[key],
                in: 'body',
                required: (ref.required || []).indexOf(key) >= 0,
              })
            }
            list = [
              ...bodyParameters,
              ...parameters.filter(item => item.in === 'query' || item.in === 'header'),
            ]
          }
        }
      }
      parse(list, 'root', 'root', 0, result, definitions, 'request', apiInfo)
    }

    const tree = arrayToTree(JSON.parse(JSON.stringify(result)))
    return tree
  }

  /**
   * 返回参数对象->数组->标准树形对象
   * 如果swagger responses参数没有的情况下异常处理
   * 如果swagger responses对象200不存在情况下异常处理
   * @param swagger
   * @param response
   */
  public static async swaggerToModelRespnse(
    swagger: SwaggerData,
    response: object,
    apiInfo: any,
  ): Promise<any> {
    let { definitions = {} } = swagger
    definitions = JSON.parse(JSON.stringify(definitions)) // 防止接口之间数据处理相互影响

    const successObj = response['200']
    if (!successObj) return []

    const { schema } = successObj
    if (!schema?.$ref) {
      // 没有按照接口规范返回数据结构,默认都是对象
      return []
    }

    const parameters = []
    const refName = schema.$ref.split('#/definitions/')[1]
    const ref = definitions[refName]
    if (ref && ref.properties) {
      const properties = ref.properties

      for (const key in properties) {
        // 公共返回参数描述信息设置
        let description = ''
        if (!properties[key].description && key === 'errorCode') {
          description = '错误码'
        }
        if (!properties[key].description && key === 'errorMessage') {
          description = '错误描述'
        }
        if (!properties[key].description && key === 'success') {
          description = '请求业务结果'
        }

        parameters.push({
          name: key,
          ...properties[key],
          in: 'body',
          required: key === 'success' ? true : (ref.required || []).indexOf(key) >= 0,
          default: key === 'success' ? true : properties[key].default || false,
          description: properties[key].description || description,
        })
      }
    }

    const result = []
    parse(parameters, 'root', 'root', 0, result, definitions, 'response', apiInfo)
    const tree = arrayToTree(JSON.parse(JSON.stringify(result)))
    return tree
  }

  public static async importRepoFromSwaggerProjectData(
    repositoryId: number,
    curUserId: number,
    swagger: SwaggerData,
  ): Promise<boolean> {
    checkSwaggerResult = []
    if (!swagger.paths || !swagger.swagger) return false

    let mCounter = 1 // 模块优先级顺序
    let iCounter = 1 // 接口优先级顺序
    let pCounter = 1 // 参数优先级顺序

    /**
     * 接口创建并批量创建属性，规则，默认值，说明等处理
     * @param p
     * @param scope
     * @param interfaceId
     * @param moduleId
     * @param parentId
     */
    async function processParam(
      p: SwaggerParameter,
      scope: SCOPES,
      interfaceId: number,
      moduleId: number,
      parentId?: number,
    ) {
      const { rule, value, type, description } = transformRapParams(p)
      const joinDescription = `${p.description || ''}${
        (p.description || '') && (description || '') ? '|' : ''
        }${description || ''}`
      const pCreated = await Property.create({
        scope,
        name: p.name,
        rule,
        value,
        type,
        required: p.required,
        description: joinDescription,
        priority: pCounter++,
        interfaceId: interfaceId,
        creatorId: curUserId,
        moduleId: moduleId,
        repositoryId: repositoryId,
        parentId: parentId || -1,
        pos: REQUEST_TYPE_POS[p.in],
        memory: true,
      })

      for (const subParam of p.children) {
        processParam(subParam, scope, interfaceId, moduleId, pCreated.id)
      }
    }

    let { tags = [], paths = {}, host = '' } = swagger
    let pathTag: SwaggerTag[] = []

    // 获取所有的TAG: 处理ROOT TAG中没有的情况
    for (const action in paths) {
      const apiObj = paths[action][Object.keys(paths[action])[0]]
      const index = pathTag.findIndex((it: SwaggerTag) => {
        return apiObj.tags.length > 0 && it.name === apiObj.tags[0]
      })
      if (index < 0 && apiObj.tags.length > 0)
        pathTag.push({
          name: apiObj.tags[0],
          description: tags.find(item => item.name === apiObj.tags[0]).description || '',
        })
    }
    tags = pathTag

    if (checkSwaggerResult.length > 0) return false

    for (const tag of tags) {
      if (checkSwaggerResult.length > 0) break

      let repository: Partial<Repository>
      let [repositoryModules] = await Promise.all([
        Repository.findByPk(repositoryId, {
          attributes: { exclude: [] },
          include: [QueryInclude.RepositoryHierarchy],
          order: [
            [{ model: Module, as: 'modules' }, 'priority', 'asc'],
            [
              { model: Module, as: 'modules' },
              { model: Interface, as: 'interfaces' },
              'priority',
              'asc',
            ],
          ],
        }),
      ])
      repository = {
        ...repositoryModules.toJSON(),
      }

      const findIndex = repository.modules.findIndex(item => {
        return item.name === tag.name
      }) // 判断是否存在模块
      let mod = null
      if (findIndex < 0) {
        mod = await Module.create({
          name: tag.name,
          description: tag.description,
          priority: mCounter++,
          creatorId: curUserId,
          repositoryId: repositoryId,
        })
      } else {
        mod = repository.modules[findIndex]
      }
      for (const action in paths) {
        const apiObj = paths[action][Object.keys(paths[action])[0]]
        const method = Object.keys(paths[action])[0]
        const actionTags0 = apiObj.tags[0]
        const url = action
        const summary = apiObj.summary

        if (actionTags0 === tag.name) {
          // 判断接口是否存在该模块中，如果不存在则创建接口，存在则更新接口信息
          let [repositoryModules] = await Promise.all([
            Repository.findByPk(repositoryId, {
              attributes: { exclude: [] },
              include: [QueryInclude.RepositoryHierarchy],
              order: [
                [{ model: Module, as: 'modules' }, 'priority', 'asc'],
                [
                  { model: Module, as: 'modules' },
                  { model: Interface, as: 'interfaces' },
                  'priority',
                  'asc',
                ],
              ],
            }),
          ])
          repository = {
            ...repositoryModules.toJSON(),
          }

          const request = await this.swaggerToModelRequest(
            swagger,
            apiObj.parameters || [],
            method,
            { url, summary },
          )
          const response = await this.swaggerToModelRespnse(swagger, apiObj.responses || {}, {
            url,
            summary,
          })
          // 处理完每个接口请求参数后，如果-遇到第一个存在接口不符合规范就全部返回
          if (checkSwaggerResult.length > 0) break

          // 判断对应模块是否存在该接口
          const index = repository.modules.findIndex(item => {
            return (
              item.id === mod.id &&
              item.interfaces.findIndex(it => (it.url || '') === url) >= 0
            ) // 已经存在接口
          })

          if (index < 0) {
            // 创建接口
            const itf = await Interface.create({
              moduleId: mod.id,
              name: `${apiObj.summary}`,
              description: apiObj.description,
              url: `${host ? `https://${host}` : ''}${url.replace('-test', '')}`,
              priority: iCounter++,
              creatorId: curUserId,
              repositoryId: repositoryId,
              method: method.toUpperCase(),
            })

            for (const p of request.children || []) {
              await processParam(p, SCOPES.REQUEST, itf.id, mod.id)
            }
            for (const p of response.children || []) {
              await processParam(p, SCOPES.RESPONSE, itf.id, mod.id)
            }
          } else {
            const findApi = repository.modules[index].interfaces.find(
              item => item.url.indexOf(url) >= 0,
            )
            // 更新接口
            await Interface.update(
              {
                moduleId: mod.id,
                name: `${apiObj.summary}`,
                description: apiObj.description,
                url: `${host ? `https://${host}` : ''}${url.replace('-test', '')}`,
                repositoryId: repositoryId,
                method: method.toUpperCase(),
              },
              { where: { id: findApi.id } },
            )

            // 获取已经存在的接口的属性信息，并处理深度和parentName
            let A_ExistsPropertiesOld = JSON.parse(JSON.stringify(findApi.properties))
            A_ExistsPropertiesOld = JSON.parse(
              JSON.stringify(treeToArray(arrayToTreeProperties(A_ExistsPropertiesOld))),
            )
            let A_ExistsProperties = A_ExistsPropertiesOld.map(property => {
              return {
                ...property,
                parentName:
                  (A_ExistsPropertiesOld.find(item => item.id === property.parentId) || {}).name ||
                  'root',
              }
            })

            const B_SwaggerProperties_Request = treeToArray(request)
            const B_SwaggerProperties_Response = treeToArray(response)
            let PropertyId = 0,
              PriorityId = 0

            let maxDepth_Request = 0,
              maxDepth_Response = 0,
              maxDepth_A_ExistsProperties = 0
            // 计算B的最大深度-- request
            B_SwaggerProperties_Request.map(item => {
              if (item.depth > maxDepth_Request) {
                maxDepth_Request = item.depth
              }
              return item
            })

            // 计算B的最大深度-- response
            B_SwaggerProperties_Response.map(item => {
              if (item.depth > maxDepth_Response) {
                maxDepth_Response = item.depth
              }
              return item
            })

            // 计算A的最大深度
            A_ExistsProperties.map(item => {
              if (item.depth > maxDepth_A_ExistsProperties) {
                maxDepth_A_ExistsProperties = item.depth
              }
              return item
            })

            const properties = []

            /**
             * 批量更新接口属性名称，类型，规则，默认值等处理
             * @param BFilterByDepth
             * @param depth
             * @param scope
             */
            const updateProperties = (BFilterByDepth, depth, scope) => {
              for (const key in BFilterByDepth) {
                const bValue = BFilterByDepth[key]
                const index = A_ExistsProperties.findIndex(
                  item =>
                    item.name === bValue.name &&
                    item.depth === bValue.depth &&
                    item.parentName === bValue.parentName &&
                    item.scope === scope,
                )
                const { type, description, rule, value } = transformRapParams(bValue)
                const joinDescription = `${bValue.description || ''}${
                  (bValue.description || '') && (description || '') ? '|' : ''
                  }${description || ''}`

                if (index >= 0) {
                  // 属性存在 ---修改：类型；是否必填；属性说明；不修改规则和默认值(前端可能正在mock)
                  // 如何判断有更新
                  if (type !== A_ExistsProperties[index].type) {
                    // 类型变更了
                    changeTip = `${changeTip}<br/>接口名称：${apiObj.summary} [更新属性：${A_ExistsProperties[index].name}类型由“${A_ExistsProperties[index].type}”变更为“${type}]”`
                  }
                  if (!!bValue.required !== A_ExistsProperties[index].required) {
                    // 是否必填变更
                    changeTip = `${changeTip}<br/>接口名称：${apiObj.summary} [更新属性：${A_ExistsProperties[index].name}是否必填由“${A_ExistsProperties[index].required}”变更为“${bValue.required}]”`
                  }

                  if (
                    joinDescription !== A_ExistsProperties[index].description &&
                    bValue.name !== 'success' &&
                    bValue.name !== 'errorCode' &&
                    bValue.name !== 'errorMessage'
                  ) {
                    // 描述信息变更
                    changeTip = `${changeTip}<br/>接口名称：${apiObj.summary} [更新属性：${
                      A_ExistsProperties[index].name
                      }属性简介由“${A_ExistsProperties[index].description ||
                      '无'}”变更为“${joinDescription}”]`
                  }

                  properties.push({
                    ...A_ExistsProperties[index],
                    rule:
                      !A_ExistsProperties[index].rule && !A_ExistsProperties[index].value
                        ? rule
                        : A_ExistsProperties[index].rule,
                    value:
                      !A_ExistsProperties[index].rule && !A_ExistsProperties[index].value
                        ? value
                        : A_ExistsProperties[index].value,
                    type,
                    required: !!bValue.required, // 是否必填更改
                    description: `${joinDescription}`,
                  })
                } else {
                  changeTip = `${changeTip}<br/>接口名称：${apiObj.summary} [属性添加：${
                    bValue.name
                    }；类型：${type} ；简介: ${bValue.description || ''}${
                    bValue.description || '' ? '|' : ''
                    }${description || ''} ]`
                  // 属性不存在
                  if (depth === 0) {
                    properties.push({
                      id: `memory-${++PropertyId}`,
                      scope,
                      type,
                      pos: REQUEST_TYPE_POS[bValue.in],
                      name: bValue.name,
                      rule,
                      value,
                      description: `${joinDescription}`,
                      parentId: -1,
                      priority: `${++PriorityId}`,
                      interfaceId: findApi.id,
                      moduleId: mod.id,
                      repositoryId,
                      memory: true,
                      depth: bValue.depth,
                      changeType: 'add',
                    })
                  } else {
                    // 找到父级属性信息
                    const parent = properties.find(
                      it =>
                        it.depth === bValue.depth - 1 &&
                        it.name === bValue.parentName &&
                        it.scope === scope,
                    )
                    properties.push({
                      id: `memory-${++PropertyId}`,
                      scope,
                      type,
                      pos: REQUEST_TYPE_POS[bValue.in],
                      name: bValue.name,
                      rule,
                      value,
                      description: `${joinDescription}`,
                      parentId: parent.id,
                      priority: `${++PriorityId}`,
                      interfaceId: findApi.id,
                      moduleId: mod.id,
                      repositoryId,
                      memory: true,
                      depth: bValue.depth,
                      changeType: 'add',
                    })
                  }
                }
              }
            }

            /** 删除属性计算 */
            const deleteProperties = (AFilterByDepth, scope) => {
              for (const key in AFilterByDepth) {
                const aValue = AFilterByDepth[key]
                let index = -1
                if (scope === 'request') {
                  index = B_SwaggerProperties_Request.findIndex(
                    item =>
                      item.name === aValue.name &&
                      item.depth === aValue.depth &&
                      item.parentName === aValue.parentName,
                  )
                } else if (scope === 'response') {
                  index = B_SwaggerProperties_Response.findIndex(
                    item =>
                      item.name === aValue.name &&
                      item.depth === aValue.depth &&
                      item.parentName === aValue.parentName,
                  )
                }

                const { type, description } = transformRapParams(aValue)
                if (index < 0) {
                  // A 存在，B不存在
                  changeTip = `${changeTip} <br/> 接口名称：${apiObj.summary} [属性删除：${
                    aValue.name
                    }；类型：${type} ；简介: ${aValue.description || ''} ${
                    description ? `${aValue.description ? '|' : ''}${description}` : ''
                    } ]`
                }
              }
            }
            for (let depth = 0; depth <= maxDepth_A_ExistsProperties; depth++) {
              const AFilterByDepth = A_ExistsProperties.filter(
                item => item.depth === depth && item.scope === 'request',
              )
              deleteProperties(AFilterByDepth, 'request')
            }
            for (let depth = 0; depth <= maxDepth_A_ExistsProperties; depth++) {
              const AFilterByDepth = A_ExistsProperties.filter(
                item => item.depth === depth && item.scope === 'response',
              )
              deleteProperties(AFilterByDepth, 'response')
            }

            for (let depth = 0; depth <= maxDepth_Request; depth++) {
              const BFilterByDepth = B_SwaggerProperties_Request.filter(
                item => item.depth === depth,
              )
              updateProperties(BFilterByDepth, depth, 'request')
            }

            for (let depth = 0; depth <= maxDepth_Response; depth++) {
              const BFilterByDepth = B_SwaggerProperties_Response.filter(
                item => item.depth === depth,
              )
              updateProperties(BFilterByDepth, depth, 'response')
            }
            await propertiesUpdateService(properties, findApi.id)
          }
        }
      }
    }

    if (checkSwaggerResult.length > 0) return false
    return true
  }

  /** Swagger property */
  public static async importRepoFromSwaggerDocUrl(
    orgId: number,
    curUserId: number,
    swagger: SwaggerData,
    version: number,
    mode: string,
    repositoryId: number,
  ): Promise<any> {
    try {
      if (!swagger) return { result: false, code: 'swagger' }
      const { host = '', info = {} } = swagger

      if (swagger.swagger === SWAGGER_VERSION[version]) {
        let result
        let mailRepositoryName = '',
          mailRepositoryId = 0,
          mailRepositoryMembers = []

        if (mode === 'manual') {
          const repos = await Repository.findByPk(repositoryId, {
            attributes: { exclude: [] },
            include: [
              QueryInclude.Creator,
              QueryInclude.Owner,
              QueryInclude.Members,
              QueryInclude.Organization,
              QueryInclude.Collaborators,
            ],
          })
          const { creatorId, members, collaborators, ownerId, name } = repos

          const body = {
            creatorId: creatorId,
            organizationId: orgId,
            memberIds: (members || []).map((item: any) => item.id),
            collaboratorIds: (collaborators || []).map((item: any) => item.id),
            ownerId,
            visibility: true,
            name,
            id: repositoryId,
            description: `[host=${host}]${info.title || ''}`,
          }
          result = await Repository.update(body, { where: { id: repositoryId } })

          mailRepositoryName = name
          mailRepositoryMembers = members
          mailRepositoryId = repositoryId
        } else if (mode === 'auto') {
          // 团队下直接导入功能作废，此处不用执行
          result = await Repository.create({
            id: 0,
            name: info.title || 'swagger导入仓库',
            description: info.description || 'swagger导入仓库',
            visibility: true,
            ownerId: curUserId,
            creatorId: curUserId,
            organizationId: orgId,
            members: [],
            collaborators: [],
            collaboratorIdstring: '',
            memberIds: [],
            collaboratorIds: [],
          })
        }

        if (result[0] || result.id) {
          const bol = await this.importRepoFromSwaggerProjectData(
            mode === 'manual' ? repositoryId : result.id,
            curUserId,
            swagger,
          )

          if (!bol) {
            return { result: checkSwaggerResult, code: 'checkSwagger' }
          } else {
            await RedisService.delCache(CACHE_KEY.REPOSITORY_GET, result.id)
            if (changeTip.length > 0) {
              const to = mailRepositoryMembers.map(item => {
                return `"${item.fullname}" ${item.email},`
              })

              MailService.send(
                to,
                `仓库：${mailRepositoryName}(${mailRepositoryId})接口更新同步`,
                sendMailTemplate(changeTip),
              )
                .then(() => { })
                .catch(() => { })

              // 钉钉消息发送
              // const dingMsg = {
              //   msgtype: 'action_card',
              //   action_card: {
              //     title: `仓库：${mailRepositoryName}(${mailRepositoryId})接口更新同步`,
              //     markdown: "支持markdown格式的正文内容",
              //     single_title: "查看仓库更新", // swagger 批量导入跳转至仓库， 如果后期只要接口更新就通知相关人的话，需要设置具体接口链接
              //     single_url: `https://rap2.alibaba-inc.com/repository/editor?id=${repositoryId}`
              //   }
              // }

              // DingPushService.dingPush(mailRepositoryMembers.map(item => item.empId).join(), dingMsg)
              // .catch((err) => { console.log(err) })
            }
            changeTip = ''
            return { result: bol, code: 'success' }
          }
        }
      } else {
        return { result: true, code: 'version' }
      }
    } catch (err) {
      console.log(err)
      return { result: false, code: 'error' }
    }
  }

  public static async importInterfaceFromJSON(data: any, curUserId: number, repositoryId: number, modId: number) {

    let itfData = data.itf ? data.itf : data
    let properties = data.itf ? data.properties : itfData?.properties

    const itf = await Interface.create({
      moduleId: modId,
      name: itfData.name,
      description: itfData.description || '',
      url: itfData.url,
      priority: 1,
      creatorId: curUserId,
      repositoryId,
      method: itfData.method,
    })

    if (!properties) {
      properties = []
    }

    const idMaps: any = {}

    await Promise.all(
      properties.map(async (pData, index) => {
        const property = await Property.create({
          scope: pData.scope,
          name: pData.name,
          rule: pData.rule,
          value: pData.value,
          type: pData.type,
          description: pData.description,
          pos: pData.pos,
          priority: 1 + index,
          interfaceId: itf.id,
          creatorId: curUserId,
          moduleId: modId,
          repositoryId,
          parentId: -1,
        })
        idMaps[pData.id] = property.id
      }),
    )

    await Promise.all(
      properties.map(async pData => {
        const newId = idMaps[pData.id]
        const newParentId = idMaps[pData.parentId]
        await Property.update(
          {
            parentId: newParentId,
          },
          {
            where: {
              id: newId,
            },
          },
        )
      }),
    )
    await RedisService.delCache(CACHE_KEY.REPOSITORY_GET, repositoryId)
  }
  /** 可以直接让用户把自己本地的 data 数据导入到 RAP 中 */
  public static async importRepoFromJSON(data: JsonData, curUserId: number, createRepo: boolean = false, orgId?: number) {
    function parseJSON(str: string) {
      try {
        const data = JSON5.parse(str)
        return _.isObject(data) ? data : {}
      } catch (error) {
        return {}
      }
    }

    if (createRepo) {
      if (orgId === undefined) {
        throw new Error("orgId is essential while createRepo = true")
      }
      const repo = await Repository.create({
        name: data.name,
        description: data.description,
        visibility: true,
        ownerId: curUserId,
        creatorId: curUserId,
        organizationId: orgId,
      })
      data.id = repo.id
    }

    const repositoryId = data.id
    await Promise.all(
      data.modules.map(async (modData, index) => {
        const mod = await Module.create({
          name: modData.name,
          description: modData.description || '',
          priority: index + 1,
          creatorId: curUserId,
          repositoryId,
        })

        await Promise.all(
          modData.interfaces.map(async (iftData, index) => {
            let properties = iftData.properties

            const itf = await Interface.create({
              moduleId: mod.id,
              name: iftData.name,
              description: iftData.description || '',
              url: iftData.url,
              priority: index + 1,
              creatorId: curUserId,
              repositoryId,
              method: iftData.method,
            })

            if (!properties && (iftData.requestJSON || iftData.responseJSON)) {
              const reqData = parseJSON(iftData.requestJSON)
              const resData = parseJSON(iftData.responseJSON)
              properties = [
                ...Tree.jsonToArray(reqData, {
                  interfaceId: itf.id,
                  moduleId: mod.id,
                  repositoryId,
                  scope: 'request',
                  userId: curUserId,
                }),
                ...Tree.jsonToArray(resData, {
                  interfaceId: itf.id,
                  moduleId: mod.id,
                  repositoryId,
                  scope: 'response',
                  userId: curUserId,
                }),
              ]
            }

            if (!properties) {
              properties = []
            }

            const idMaps: any = {}

            await Promise.all(
              properties.map(async (pData, index) => {
                const property = await Property.create({
                  scope: pData.scope,
                  name: pData.name,
                  rule: pData.rule,
                  value: pData.value,
                  type: pData.type,
                  description: pData.description,
                  pos: pData.pos,
                  priority: index + 1,
                  interfaceId: itf.id,
                  creatorId: curUserId,
                  moduleId: mod.id,
                  repositoryId,
                  parentId: -1,
                })
                idMaps[pData.id] = property.id
              }),
            )

            await Promise.all(
              properties.map(async pData => {
                const newId = idMaps[pData.id]
                const newParentId = idMaps[pData.parentId]
                await Property.update(
                  {
                    parentId: newParentId,
                  },
                  {
                    where: {
                      id: newId,
                    },
                  },
                )
              }),
            )
          }),
        )
      }),
    )

    await RedisService.delCache(CACHE_KEY.REPOSITORY_GET, repositoryId)
  }
}

function getMethodFromRAP1RequestType(type: number) {
  switch (type) {
    case 1:
      return 'GET'
    case 2:
      return 'POST'
    case 3:
      return 'PUT'
    case 4:
      return 'DELETE'
    default:
      return 'GET'
  }
}

interface JsonData {
  /**
   * 要导入的目标 repo id 名
   */
  id: number
  name?: string
  description?: string
  modules: {
    name: string
    description?: string
    /**
     * 排序优先级
     * 从 1 开始，小的在前面
     */
    interfaces: {
      name: string
      url: string
      /**
       * GET POST
       */
      method: string
      description?: string
      /**
       * 状态码
       */
      status: number
      /**
       * 标准属性数组
       */
      properties: Partial<Property>[]
      /**
       * 导入请求数据 json 字符串
       */
      requestJSON: string
      /**
       * 导入响应数据 json 字符串
       */
      responseJSON: string
    }[]
  }[]
}

interface OldParameter {
  id: number
  name: string
  mockData: string
  identifier: string
  remark: string
  dataType: string
  parameterList: OldParameter[]
  parentName: string
  depth: number
}

interface SwaggerParameter {
  name: string
  in: string
  description?: string
  required: boolean
  type: string
  allowEmptyValue?: boolean
  minLength?: number
  maxLength?: number
  format?: string
  minimum?: number
  maxinum?: number
  default?: any
  items?: SwaggerParameter[]
  collectionFormat?: string
  exclusiveMaximum?: number
  exclusiveMinimum?: number
  enum?: Array<any>
  multipleOf?: number
  uniqueItems?: boolean
  pattern?: string
  schema: any
  children: SwaggerParameter[]
  id: string
  depth: number
}

interface SwaggerTag {
  name: string
  description?: string
}

interface SwaggerInfo {
  description?: string
  title?: string
  version?: string
}

interface SwaggerData {
  swagger: string
  host: string
  tags: SwaggerTag[]
  paths: object
  definitions?: object
  info?: SwaggerInfo
}
