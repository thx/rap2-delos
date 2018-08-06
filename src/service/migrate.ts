import { Repository, Module, Interface, Property, User } from "../models";
import { SCOPES } from "../models/bo/property";
import * as md5 from 'md5'
import * as querystring from 'querystring'
import * as rp from 'request-promise'
const isMd5 = require('is-md5')

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

// function getTypeFromRAP1DataType(dataType: string) {
//   switch (dataType) {
//     case 'number':
//       return TYPES.NUMBER
//     case 'string':
//       return TYPES.STRING
//     case 'boolean':
//       return TYPES.BOOLEAN
//     case 'object':
//       return TYPES.OBJECT
//     default:
//       if (dataType && dataType.indexOf('array') > -1) {
//         return TYPES.ARRAY
//       } else {
//         return TYPES.STRING
//       }
//   }
// }

interface OldParameter {
  id: number
  name: string
  mockData: string
  identifier: string
  remark: string
  dataType: string
  parameterList: OldParameter[]
}
