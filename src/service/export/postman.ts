import { PostmanCollection, Folder, Item } from "../../types/postman"
import { Repository, Interface, Module, Property } from "../../models"
import * as url from 'url'
import { POS_TYPE } from "../../models/bo/property"
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
        const eventScript = await Property.findAll({
          where: { interfaceId, scope: 'script' }
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
              port: parseResult.port || null,
              hash: parseResult.hash,
              path: [parseResult.path],
              query: getQuery(requestParams),
            },
            description: itf.description,
          },
          response: responseParams.map(x => ({ key: x.name, value: x.value })),
          event: getEvent(eventScript)
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
    "formdata": pList.filter(x => x.pos === POS_TYPE.BODY)
      .map(x => ({ key: x.name, value: x.value, description: x.description, type: "text" as "text" })),
  }
}

function getQuery(pList: Property[]) {
  return pList.filter(x => x.pos === null || x.pos === POS_TYPE.QUERY)
    .map(x => ({ key: x.name, value: x.value, description: x.description }))
}

function getHeader(pList: Property[]) {
  return pList.filter(x => x.pos === POS_TYPE.HEADER)
    .map(x => ({ key: x.name, value: x.value, description: x.description }))
}

function getEvent(pList: Property[]) {
  return pList.filter(x => (x.pos === POS_TYPE.PRE_REQUEST_SCRIPT || x.pos === POS_TYPE.TEST))
    .map(x => ({
      key: x.name,
      script: { key: x.name, type: 'text/javascript', exec: x.value },
      disabled: false,
      listen: x.pos === POS_TYPE.PRE_REQUEST_SCRIPT ? 'prerequest' : 'test'
    }))
}