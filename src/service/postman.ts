import { PostmanCollection, Folder, Item } from "../types/postman"
import { Repository, Interface, Module, Property } from "../models"

const SCHEMA_V_2_1_0 = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'

export default class PostmanService {
  public static async export(repositoryId: number): Promise<PostmanCollection> {
    const repo = await Repository.findById(repositoryId, {
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
        const itfItem: Item = {
          name: itf.name,
          request: {
            method: itf.method as any,
            url: {
              raw: itf.url,
              query: requestParams.map(x => ({ key: x.name, value: x.value })),
            },
            description: itf.description,
          },
          response: responseParams.map(x => ({ key: x.name, vlaue: x.value })),
        }
        modItem.item.push(itfItem)
      }
      result.item.push(modItem)
    }
    return result
  }
}