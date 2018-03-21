import { Module, Interface, Property } from '../../models'
import { Repository } from '../../models'

const genExampleModule = (extra: any) => Object.assign({
  name: '示例模块',
  description: '示例模块',
  creatorId: undefined,
  repositoryId: undefined,
}, extra)
const genExampleInterface = (extra: any) => Object.assign({
  name: '示例接口',
  url: `/example/${Date.now()}`,
  method: 'GET',
  description: '示例接口描述',
  creatorId: undefined,
  lockerId: undefined,
  moduleId: undefined,
  repositoryId: undefined,
}, extra)
const genExampleProperty = (extra: any) => Object.assign({
  scope: undefined,
  name: 'foo',
  type: 'String',
  rule: '',
  value: '@ctitle',
  description: ({ request: '请求属性示例', response: '响应属性示例' } as any)[extra.scope],
  parentId: -1,
  creatorId: undefined,
  interfaceId: undefined,
  moduleId: undefined,
  repositoryId: undefined,
}, extra)

// 初始化仓库
const initRepository = async (repository: Repository) => {
  let mod = await Module.create(genExampleModule({
    creatorId: repository.creatorId,
    repositoryId: repository.id,
  }))
  await initModule(mod)
}
// 初始化模块
const initModule = async (mod: Module) => {
  let itf = await Interface.create(genExampleInterface({
    creatorId: mod.creatorId,
    moduleId: mod.id,
    repositoryId: mod.repositoryId,
  }))
  await initInterface(itf)
}
// 初始化接口
const initInterface = async (itf: Interface) => {
  let { creatorId, repositoryId, moduleId } = itf
  let interfaceId = itf.id
  await Property.create(genExampleProperty({
    scope: 'request',
    creatorId,
    repositoryId,
    moduleId,
    interfaceId,
  }))
  // TODO 2.1 完整的 Mock 示例：无法模拟所有 Mock 规则
  await Property.create(genExampleProperty({
    scope: 'response',
    name: 'string',
    type: 'String',
    rule: '1-10',
    value: '★',
    description: '字符串属性示例',
    creatorId,
    repositoryId,
    moduleId,
    interfaceId,
  }))
  await Property.create(genExampleProperty({
    scope: 'response',
    name: 'number',
    type: 'Number',
    rule: '1-100',
    value: '1',
    description: '数字属性示例',
    creatorId,
    repositoryId,
    moduleId,
    interfaceId,
  }))
  await Property.create(genExampleProperty({
    scope: 'response',
    name: 'boolean',
    type: 'Boolean',
    rule: '1-2',
    value: 'true',
    description: '布尔属性示例',
    creatorId,
    repositoryId,
    moduleId,
    interfaceId,
  }))
  await Property.create(genExampleProperty({
    scope: 'response',
    name: 'regexp',
    type: 'RegExp',
    rule: '',
    value: '/[a-z][A-Z][0-9]/',
    description: '正则属性示例',
    creatorId,
    repositoryId,
    moduleId,
    interfaceId,
  }))
  await Property.create(genExampleProperty({
    scope: 'response',
    name: 'function',
    type: 'Function',
    rule: '',
    value: '() => Math.random()',
    description: '函数属性示例',
    creatorId,
    repositoryId,
    moduleId,
    interfaceId,
  }))
  let array = await Property.create(genExampleProperty({
    scope: 'response',
    name: 'array',
    type: 'Array',
    rule: '1-10',
    value: '',
    description: '数组属性示例',
    creatorId,
    repositoryId,
    moduleId,
    interfaceId,
  }))
  await Property.create(genExampleProperty({
    scope: 'response',
    name: 'foo',
    type: 'Number',
    rule: '+1',
    value: 1,
    description: '数组元素示例',
    parentId: array.id,
    creatorId,
    repositoryId,
    moduleId,
    interfaceId,
  }))
  await Property.create(genExampleProperty({
    scope: 'response',
    name: 'bar',
    type: 'String',
    rule: '1-10',
    value: '★',
    description: '数组元素示例',
    parentId: array.id,
    creatorId,
    repositoryId,
    moduleId,
    interfaceId,
  }))
  await Property.create(genExampleProperty({
    scope: 'response',
    name: 'items',
    type: 'Array',
    rule: '',
    value: `[1, true, 'hello', /\\w{10}/]`,
    description: '自定义数组元素示例',
    creatorId,
    repositoryId,
    moduleId,
    interfaceId,
  }))
  let object = await Property.create(genExampleProperty({
    scope: 'response',
    name: 'object',
    type: 'Object',
    rule: '',
    value: '',
    description: '对象属性示例',
    creatorId,
    repositoryId,
    moduleId,
    interfaceId,
  }))
  await Property.create(genExampleProperty({
    scope: 'response',
    name: 'foo',
    type: 'Number',
    rule: '+1',
    value: 1,
    description: '对象属性示例',
    parentId: object.id,
    creatorId,
    repositoryId,
    moduleId,
    interfaceId,
  }))
  await Property.create(genExampleProperty({
    scope: 'response',
    name: 'bar',
    type: 'String',
    rule: '1-10',
    value: '★',
    description: '对象属性示例',
    parentId: object.id,
    creatorId,
    repositoryId,
    moduleId,
    interfaceId,
  }))
  await Property.create(genExampleProperty({
    scope: 'response',
    name: 'placeholder',
    type: 'String',
    rule: '',
    value: '@title',
    description: '占位符示例',
    creatorId,
    repositoryId,
    moduleId,
    interfaceId,
  }))
}

module.exports = {
  genExampleModule,
  genExampleInterface,
  initRepository,
  initModule,
  initInterface,
}
