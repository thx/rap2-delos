import { PostmanCollection, Folder, Item } from "../../types/postman"
import { Repository, Interface, Module, Property } from "../../models"
import * as url from 'url'
import { REQUEST_PARAMS_TYPE } from "../../models/bo/property"
import UrlUtils from "../../routes/utils/url"

const SCHEMA_V_2_1_0 = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'

export default class PostmanService {
  public static async export(repositoryId: number): Promise<PostmanCollection> {
    const repo = await Repository.findByPk(repositoryId, {
      include: [{
        model: Module,
        as: 'modules',
        include: [{
          model: Interface,
          as: 'interfaces',
          include: [{
            model: Property,
            as: 'properties',
          }]
        }]
      }]
    })
    const result: PostmanCollection = {
      info: {
        name: `RAP2 Pack ${repo.name}`,
        schema: SCHEMA_V_2_1_0,
      },
      item: []
    }

    for (const mod of repo.modules) {
      const modItem: Folder = {
        name: mod.name,
        item: [],
      }

      for (const itf of mod.interfaces) {
        const interfaceId = itf.id
        const requestParams = await Property.findAll({
          where: { interfaceId, scope: 'request' }
        })
        const responseParams = await Property.findAll({
          where: { interfaceId, scope: 'response' }
        })

        const relativeUrl = UrlUtils.getRelative(itf.url)
        const parseResult = url.parse(itf.url)
        const itfItem: Item = {
          name: itf.name,
          request: {
            method: itf.method as any,
            header: getHeader(requestParams),
            body: getBody(requestParams),
            url: {
              raw: `{{url}}${relativeUrl}`,
              host: '{{url}}',
              port: parseResult.port || '',
              hash: parseResult.hash,
              path: [parseResult.path],
              query: getQuery(requestParams),
            },
            description: itf.description,
          },
          response: responseParams.map(x => ({ key: x.name, value: x.value })),
        }
        modItem.item.push(itfItem)
      }
      result.item.push(modItem)
    }
    return result
  }
}

function getBody(pList: Property[]) {
  return {
    "mode": "formdata" as "formdata",
    "formdata": pList.filter(x => x.pos === REQUEST_PARAMS_TYPE.BODY_PARAMS)
      .map(x => ({ key: x.name, value: x.value, description: x.description, type: "text" as "text"})),
  }
}

function getQuery(pList: Property[]) {
  return pList.filter(x => x.pos === null || x.pos === REQUEST_PARAMS_TYPE.QUERY_PARAMS)
    .map(x => ({ key: x.name, value: x.value, description: x.description }))
}

function getHeader(pList: Property[]) {
  return pList.filter(x => x.pos === REQUEST_PARAMS_TYPE.HEADERS)
    .map(x => ({ key: x.name, value: x.value, description: x.description }))
}