import { Repository, Interface, Module, Property } from '../../models'
import dedent from '../../helpers/dedent'
import * as moment from 'moment'
import { asTree } from 'treeify'

const arrayToTree = (list: any[]): any => {
  const getValue = (parent: any) => {
    const children = list.filter((item: any) => item.parentId === parent.id)
    if (!children.length) {
      return `${parent.type} ${parent.description ? `(${parent.description})` : ''}`
    }
    const obj: { [k: string]: any } = {}
    children.forEach((e: any) => {
      if (e.type === 'Array' || e.type === 'Object') {
        obj[e.name + `: ${e.type} ${e.description ? `(${e.description})` : ''}`] = getValue(e)
      } else {
        obj[e.name] = getValue(e)
      }
    })
    return obj
  }
  return getValue({id: -1})
}

export default class PostmanService {
  public static async export(repositoryId: number, origin: string): Promise<string> {
    const repo = await Repository.findByPk(repositoryId, {
      include: [
        {
          model: Module,
          as: 'modules',
          include: [
            {
              model: Interface,
              as: 'interfaces',
              include: [
                {
                  model: Property,
                  as: 'properties'
                }
              ]
            }
          ]
        }
      ]
    })

    const result = dedent`
    ***本文档由 Rap2 (https://github.com/thx/rap2-delos) 生成***

    ***本项目仓库：[${origin}/repository/editor?id=${repositoryId}](${origin}/repository/editor?id=${repositoryId}) ***

    ***生成日期：${moment().format('YYYY-MM-DD HH:mm:ss')}***

    # 仓库：${repo.name}
    ${repo.modules
      .map(
        m => dedent`
      ## 模块：${m.name}
      ${m.interfaces
        .map(
          intf => dedent`
        ### 接口：${intf.name}
        * 地址：${intf.url}
        * 类型：${intf.method}
        * 状态码：${intf.status}
        * 简介：${intf.description || '无'}
        * Rap地址：[${origin}/repository/editor?id=${repositoryId}&mod=${m.id}&itf=${intf.id}](${origin}/repository/editor?id=${repositoryId}&mod=${m.id}&itf=${intf.id})
        * 请求接口格式：

        \`\`\`
        ${asTree(arrayToTree(intf.properties.filter(item => item.scope === 'request')), true, undefined)}
        \`\`\`

        * 返回接口格式：

        \`\`\`
        ${asTree(arrayToTree(intf.properties.filter(item => item.scope === 'response')), true, undefined)}
        \`\`\`
      `
        )
        .join('\n\n\n')}
    `
      )
      .join('\n\n\n')}
    `
    return result
  }
}
