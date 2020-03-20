import { Repository, Module, Interface, Property, User, QueryInclude } from '../models'
import { SCOPES } from "../models/bo/property"
import * as md5 from 'md5'
import * as querystring from 'querystring'
import * as rp from 'request-promise'
const isMd5 = require('is-md5')
import Tree from '../routes/utils/tree'
import * as JSON5 from 'json5'
import RedisService, { CACHE_KEY } from "./redis"
import * as _ from 'lodash'

const SWAGGER_VERSION = {
  1: '2.0'
}



const arrayToTree = (list) => {
  const parseChildren = (list, parent) => {
    list.forEach((item) => {
      if (item.parent === parent.id) {
        item.depth = parent.depth + 1
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
    parent: -1
  })
}

const REQUEST_TYPE_POS = {
  path: 2,
  query: 2,
  header: 1,
  formData: 3,
  body: 3
}

/**
 * @param parameters 参数列表数组
 * @param parent 父级
 * @param result swagger转化为数组结果
 * @param definitions swagger $ref definitions
 */
const parse = (parameters, parent, result, definitions) => {
  for (let key = 0, len = parameters.length; key < len; key++) {
    const param = parameters[key]

    if (!param.$ref && !(param.items || {}).$ref) {
      // 非对象或者数组的基础类型
      result.push({
        ...param, parent,
        id: `${parent}-${key}`
      })
    } else {
      // 数组类型或者对象类型
      let paramType =  ''
      if (param.items) { paramType = 'array' }
      else { paramType = 'object' }

      result.push({
        ...param, parent,
        id: `${parent}-${key}`,
        type: paramType
      })

      let refName

      if (!param.items) {
        refName = param.$ref.split('#/definitions/')[1]
        delete result.find(item => item.id === `${parent}-${key}`)['$ref']
      }
      if (param.items) {
        refName = param.items.$ref.split('#/definitions/')[1]
        delete result.find(item => item.id === `${parent}-${key}`).items
      }

      const ref = definitions[refName]
      if (ref && ref.properties) {
        const properties = ref.properties
        const list = []
        for (const key in properties) {
          list.push({
            name: key,
            ...properties[key],
            in: param.in, // response 无所谓，不使用但是request 使用
            required: (ref.required || []).indexOf(key) >= 0
          })
        }
        parse(list, `${parent}-${key}`, result, definitions)
      }
    }
  }
}

export default class MigrateService {
  public static async importRepoFromRAP1ProjectData(orgId: number, curUserId: number, projectData: any): Promise<boolean> {
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
        repositoryId: repo.id
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
            method: getMethodFromRAP1RequestType(+action.requestType)
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
            if (/^\$order/.test(value)) { // $order => Array|+1
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
  public static async importRepoFromRAP1DocUrl(orgId: number, curUserId: number, docUrl: string): Promise<boolean> {
    const { projectId } = querystring.parse(docUrl.substring(docUrl.indexOf('?') + 1))
    let domain = docUrl
    if (domain.indexOf('http') === -1) {
      domain = 'http://' + domain
    }
    domain = domain.substring(0, domain.indexOf('/', domain.indexOf('.')))
    let result = await rp(`${domain}/api/queryRAPModel.do?projectId=${projectId}`, {
      json: false,
    })
    result = JSON.parse(result)

    // result =  unescape(result.modelJSON)
    result = result.modelJSON
    const safeEval = require('notevil')
    result = safeEval('(' + result + ')')
    return await this.importRepoFromRAP1ProjectData(orgId, curUserId, result)
  }

 /** 请求参对象->数组->标准树形对象 @param swagger @param parameters */
  public static async swaggerToModelRequest(swagger: SwaggerData, parameters: Array<any>, method: string): Promise<any> {
    const { definitions } = swagger
    const result = []

    if (method === 'get' || method === 'GET') {
      parse(parameters, 'root', result, definitions)
    } else if (method === 'post' || method === 'POST') {
      let list = [] // 外层处理参数数据结果
      const bodyObj = parameters.find(item => item.in === 'body') // body unique

      if (!bodyObj) list = [ ...parameters ]
      else {
        const { schema } = bodyObj
        if (!schema.$ref) {
          // 没有按照接口规范返回数据结构,默认都是对象
          list = parameters.filter(item => (item.in === 'query' || item.in === 'header'))
        } else {
          const refName = schema.$ref.split('#/definitions/')[1]
          const ref = definitions[refName]

          if (!ref) list = [ ...parameters.filter(item => (item.in === 'query' || item.in === 'header'))]
          else {
            const properties = ref.properties || {}
            const bodyParameters = []

            for (const key in properties) {
              bodyParameters.push({
                name: key,
                ...properties[key],
                in: 'body',
                required: (ref.required || []).indexOf(key) >= 0
              })
            }
            list = [...bodyParameters, ...parameters.filter(item => (item.in === 'query' || item.in === 'header'))]
          }
        }
      }
      parse(list, 'root', result, definitions)
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
  public static async swaggerToModelRespnse (swagger: SwaggerData, response: object): Promise<any> {
    const { definitions } = swagger
    const successObj = response['200']
    if (!successObj) return []

    const { schema } = successObj
    if (!schema.$ref) {
      // 没有按照接口规范返回数据结构,默认都是对象
      return []
    }

    const parameters = []
    const refName = schema.$ref.split('#/definitions/')[1]
    const ref = definitions[refName]
    if (ref && ref.properties) {
      const properties = ref.properties

      for (const key in properties) {
        parameters.push({
          name: key,
          ...properties[key],
          in: 'body',
          required: (ref.required || []).indexOf(key) >= 0
        })
      }
    }

    const result = []
    parse(parameters, 'root', result, definitions)

    const tree = arrayToTree(JSON.parse(JSON.stringify(result)))
    return tree
  }

  public static async importRepoFromSwaggerProjectData(repositoryId: number, curUserId: number, swagger: SwaggerData): Promise<boolean> {
    if (!swagger.paths || !swagger.swagger || !swagger.host) return false

    let mCounter = 1 // 模块优先级顺序
    let iCounter = 1 // 接口优先级顺序
    let pCounter = 1 // 参数优先级顺序

    async function processParam(p: SwaggerParameter, scope: SCOPES, interfaceId: number, moduleId: number, parentId?: number, ) {
      const name = p.name
      let description = ''

      // 规则转化处理
      let rule = ''
      if (p.type === 'string' && p.minLength && p.maxLength ) {
        rule = `${p.minLength}-${p.maxLength}`
      } else if (p.type === 'string' && p.minLength && !p.maxLength) {
        rule = `${p.minLength}`
      } else if (p.type === 'string' && !p.minLength && p.maxLength) {
        rule = `${p.required ? '1' : '0'}-${p.maxLength}`
      }
      if (p.type === 'string' && p.enum && p.enum.length > 0) {
        description = `${description} 枚举值: ${p.enum.join()}`
      }

      if (p.type === 'integer' && p.minimum && p.maxinum) {
        rule = `${p.minimum}-${p.maxinum}`
      }
      if (p.type === 'integer' && p.minimum && !p.maxinum) {
        rule = `${p.minimum}`
      }
      if (p.type === 'integer' && !p.minimum && p.maxinum) {
        rule = `${p.required ? '1' : '0'}-${p.maxinum}`
      }

      // 类型转化处理
      let type = (p.type || 'string')
      if (type === 'integer') type = 'number'
      type = type[0].toUpperCase() + type.slice(1) // foo => Foo 首字母转化为大写

      // 默认值转化处理
      let value = p.default || ''
      if (p.type === 'boolean') {
        value = (p.default === true || p.default === false) ? p.default.toString() : ''
      }
      if (p.type === 'array' && p.default) {
        value = typeof(p.default) === 'object' ? JSON.stringify(p.default) : p.default.toString()
      }
      if (/^function/.test(value)) type = 'Function' // @mock=function(){} => Function
      if (/^\$order/.test(value)) { // $order => Array|+1
        type = 'Array'
        rule = '+1'
        let orderArgs = /\$order\((.+)\)/.exec(value)
        if (orderArgs) value = `[${orderArgs[1]}]`
      }

      const pCreated = await Property.create({
        scope,
        name,
        rule,
        value,
        type,
        required: p.required,
        description: `${p.description || ''} ${description ? `|${description}` : ''}`,
        priority: pCounter++,
        interfaceId: interfaceId,
        creatorId: curUserId,
        moduleId: moduleId,
        repositoryId: repositoryId,
        parentId: parentId || -1,
        pos: REQUEST_TYPE_POS[p.in],
        memory: true
      })

      for (const subParam of p.children) {
        processParam(subParam, scope, interfaceId, moduleId, pCreated.id)
      }
    }

    let { tags = [], paths = {}, host = '' } = swagger
    let pathTag: SwaggerTag[] = []

    // 处理root tag中没有的情况
    for (const action in paths) {
      const apiObj = paths[action][Object.keys(paths[action])[0]]
      const index = pathTag.findIndex((it: SwaggerTag) => {
        return apiObj.tags.length > 0 && it.name === apiObj.tags[0]
      } )
      if (index < 0 && apiObj.tags.length > 0) pathTag.push({ name : apiObj.tags[0], description: tags.find(item => item.name === apiObj.tags[0]).description || '' })
    }
    tags = pathTag

    for (const tag of tags) {
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
              'asc'
            ]
          ]
        })
      ])
      repository = {
        ...repositoryModules.toJSON()
      }

      const findIndex = repository.modules.findIndex(item => { return item.name === tag.name }) // 判断是否存在模块
      let mod = null
      if (findIndex < 0) {
        mod = await Module.create({
          name: tag.name,
          description: tag.description,
          priority: mCounter++,
          creatorId: curUserId,
          repositoryId: repositoryId
        })
      } else {
        mod = repository.modules[findIndex]
      }

      for (const action in paths) {
        const apiObj = paths[action][Object.keys(paths[action])[0]]
        const method = Object.keys(paths[action])[0]
        const actionTags0 = apiObj.tags[0]
        const url = action

        if (actionTags0 === tag.name) {
          // 判断接口是否存在在该模块中，如果不存在则创建接口，存在则更新接口信息
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
                  'asc'
                ]
              ]
            })
          ])
          repository = {
            ...repositoryModules.toJSON()
          }

          const request = await this.swaggerToModelRequest(swagger, apiObj.parameters || {}, method)
          const response = await this.swaggerToModelRespnse(swagger, apiObj.responses || {})

          // 判断对应模块是否存在该接口
          const index = repository.modules.findIndex(item => {
            return item.id === mod.id && (item.interfaces.findIndex(it => (it.url || '').indexOf(url) >= 0 ) >= 0) // 已经存在接口
          })

          if (index < 0) {
            // 创建接口
            const itf = await Interface.create({
              moduleId: mod.id,
              name: `${apiObj.summary}`,
              description: apiObj.description,
              url: `https//${host}${url.replace('-test', '')}`,
              priority: iCounter++,
              creatorId: curUserId,
              repositoryId: repositoryId,
              method: method.toUpperCase()
            })

            for (const p of (request.children || [])) {
              await processParam(p, SCOPES.REQUEST, itf.id, mod.id)
            }
            for (const p of (response.children || [])) {
              await processParam(p, SCOPES.RESPONSE, itf.id, mod.id)
            }

          } else {
            const findApi = repository.modules[index].interfaces.find(item => item.url.indexOf(url) >= 0)
            // 更新接口
            await Interface.update({
              moduleId: mod.id,
              name: `${apiObj.summary}`,
              description: apiObj.description,
              url: `https//${host}${url.replace('-test', '')}`,
              repositoryId: repositoryId,
              method: method.toUpperCase()
            },  { where: { id: findApi.id } })

            await Property.destroy({ where: { interfaceId: findApi.id } })

            for (const p of (request.children || [])) {
              await processParam(p, SCOPES.REQUEST, findApi.id, mod.id)
            }
            for (const p of (response.children || [])) {
              await processParam(p, SCOPES.RESPONSE, findApi.id, mod.id)
            }
          }
        }
      }
    }
    return true
  }

  /** Swagger property */
  public static async importRepoFromSwaggerDocUrl(orgId: number, curUserId: number, swagger: SwaggerData, version: number, mode: string, repositoryId: number): Promise<any> {
    try {
        if (!swagger) return { result: false, code: 'swagger'}
        const { host = '', info = {} } = swagger

        if (swagger.swagger === SWAGGER_VERSION[version]) {
          let result

          if (mode === 'manual') {
            const repos = await Repository.findByPk(repositoryId)
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
          } else if (mode === 'auto') {
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
              collaboratorIds: []
            })
          }

          if (result[0] || result.id) {
            const bol = await this.importRepoFromSwaggerProjectData(mode === 'manual' ? repositoryId : result.id, curUserId, swagger)
            await RedisService.delCache(CACHE_KEY.REPOSITORY_GET, result.id)
            return { result: bol, code: 'success' }
          }
        } else {
          return { result: true, code: 'version'}
        }
    } catch (err) {
      return { result: false, code: 'error'}
    }
  }

  /** 可以直接让用户把自己本地的 data 数据导入到 RAP 中 */
  public static async importRepoFromJSON(data: JsonData, curUserId: number) {
    function parseJSON(str: string) {
      try {
        const data = JSON5.parse(str)
        return _.isObject(data) ? data : {}
      } catch (error) {
        return {}
      }
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

interface  SwaggerTag  {
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
  definitions?: object,
  info?: SwaggerInfo
}

