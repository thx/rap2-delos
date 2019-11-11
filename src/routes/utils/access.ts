import OrganizationService from '../../service/organization'
import RepositoryService from '../../service/repository'
import { Module, Interface, Property } from '../../models'

export enum ACCESS_TYPE { ORGANIZATION, REPOSITORY, MODULE, INTERFACE, PROPERTY, USER, ADMIN }
const inTestMode = process.env.TEST_MODE === 'true'

export class AccessUtils {
  public static async canUserAccess(accessType: ACCESS_TYPE, curUserId: number, entityId: number, token?: string): Promise<boolean> {
    if (inTestMode) {
      return true
    }
    if (accessType === ACCESS_TYPE.ORGANIZATION) {
      return await OrganizationService.canUserAccessOrganization(curUserId, entityId)
    } else if (accessType === ACCESS_TYPE.REPOSITORY) {
      return await RepositoryService.canUserAccessRepository(curUserId, entityId, token)
    } else if (accessType === ACCESS_TYPE.MODULE) {
      const mod = await Module.findByPk(entityId)
      return await RepositoryService.canUserAccessRepository(curUserId, mod.repositoryId, token)
    } else if (accessType === ACCESS_TYPE.INTERFACE) {
      const itf = await Interface.findByPk(entityId)
      return await RepositoryService.canUserAccessRepository(curUserId, itf.repositoryId, token)
    } else if (accessType === ACCESS_TYPE.PROPERTY) {
      const p = await Property.findByPk(entityId)
      return await RepositoryService.canUserAccessRepository(curUserId, p.repositoryId, token)
    }
    return false
  }

  public static isAdmin(curUserId: number) {
    if (inTestMode) {
      return true
    }
    return curUserId === 1
  }
}