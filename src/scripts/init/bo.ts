import { mock } from 'mockjs'

const scopes = ['request', 'response']
const methods = ['GET', 'POST', 'PUT', 'DELETE']
const types = ['String', 'Number', 'Boolean', 'Object', 'Array', 'Function', 'RegExp', 'Null']
const values = ['@INT', '@FLOAT', '@TITLE', '@NAME']

let USER_ID = 100000000
let ORGANIZATION_ID = 1
let REPOSITORY_ID = 1
let MODULE_ID = 1
let INTERFACE_ID = 1
let PROPERTY_ID = 1

export const  BO_ADMIN =  { id: USER_ID++, fullname: 'admin', email: 'admin@rap2.com', password: 'admin' }

export const BO_MOZHI = { id: USER_ID++, fullname: '墨智', email: 'mozhi@rap2.com', password: 'mozhi' }

export const BO_USER_COUNT = 10

export const BO_USER_FN = () => mock({
  id: USER_ID++,
  fullname: '@cname',
  email: '@email',
  password: '@word(6)',
})

export const BO_ORGANIZATION_COUNT = 3

export const BO_ORGANIZATION_FN = (source: any) => {
  return Object.assign(
    mock({
      id: ORGANIZATION_ID++,
      name: '组织@ctitle(5)',
      description: '@cparagraph',
      logo: '@url',
      creatorId: undefined,
      owner: undefined,
      members: '',
    }),
    source,
  )
}
export const BO_REPOSITORY_COUNT = 3

export const BO_REPOSITORY_FN = (source: any) => {
  return Object.assign(
    mock({
      id: REPOSITORY_ID++,
      name: '仓库@ctitle',
      description: '@cparagraph',
      logo: '@url',
    }),
    source,
  )
}

export const BO_MODULE_COUNT = 3
export const BO_MODULE_FN = (source: any) => {
  return Object.assign(
    mock({
      id: MODULE_ID++,
      name: '模块@ctitle(4)',
      description: '@cparagraph',
      repositoryId: undefined,
      creatorId: undefined,
    }),
    source,
  )
}
export const BO_INTERFACE_COUNT = 3
export const BO_INTERFACE_FN = (source: any) => {
  return Object.assign(
    mock({
      id: INTERFACE_ID++,
      name: '接口@ctitle(4)',
      url: '/@word(5)/@word(5)/@word(5).json',
      'method|1': methods,
      description: '@cparagraph',
      creatorId: undefined,
      lockerId: undefined,
      repositoryId: undefined,
      moduleId: undefined,
    }),
    source,
  )
}
export const BO_PROPERTY_COUNT = 6
export const BO_PROPERTY_FN = (source: any) => {
  return Object.assign(
    mock({
      id: PROPERTY_ID++,
      'scope|1': scopes,
      name: '@word(6)',
      'type|1': types,
      'value|1': values,
      description: '@csentence',
      creatorId: undefined,
      repositoryId: undefined,
      moduleId: undefined,
      interfaceId: undefined,
    }),
    source,
  )
}