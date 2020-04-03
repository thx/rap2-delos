import OrganizationService from '../../service/organization'
import RepositoryService from '../../service/repository'
import { Module, Interface, Property } from '../../models'

export enum ACCESS_TYPE {
  ORGANIZATION_GET,
  ORGANIZATION_SET,
  REPOSITORY_GET,
  REPOSITORY_SET,
  MODULE_GET,
  MODULE_SET,
  INTERFACE_GET,
  INTERFACE_SET,
  PROPERTY_GET,
  PROPERTY_SET,
  USER,
  ADMIN,
}
const inTestMode = process.env.TEST_MODE === 'true'

export class AccessUtils {
  public static async canUserAccess(
    accessType: ACCESS_TYPE,
    curUserId: number,
    entityId: number,
    token?: string,
  ): Promise<boolean> {
    // 测试模式无权限
    if (inTestMode) {
      return true
    }

    // 无 session 且无 toeken 时拒绝访问
    if (!curUserId && !token) {
      return false
    }

    if (
      accessType === ACCESS_TYPE.ORGANIZATION_GET ||
      accessType === ACCESS_TYPE.ORGANIZATION_SET
    ) {
      return OrganizationService.canUserAccessOrganization(curUserId, entityId)
    } else if (
      accessType === ACCESS_TYPE.REPOSITORY_GET ||
      accessType === ACCESS_TYPE.REPOSITORY_SET
    ) {
      return RepositoryService.canUserAccessRepository(curUserId, entityId, token)
    } else if (accessType === ACCESS_TYPE.MODULE_GET || accessType === ACCESS_TYPE.MODULE_SET) {
      const mod = await Module.findByPk(entityId)
      return RepositoryService.canUserAccessRepository(curUserId, mod.repositoryId, token)
    } else if (
      accessType === ACCESS_TYPE.INTERFACE_GET ||
      accessType === ACCESS_TYPE.INTERFACE_SET
    ) {
      const itf = await Interface.findByPk(entityId)
      return RepositoryService.canUserAccessRepository(curUserId, itf.repositoryId, token)
    } else if (accessType === ACCESS_TYPE.PROPERTY_GET || accessType === ACCESS_TYPE.PROPERTY_SET) {
      const p = await Property.findByPk(entityId)
      return RepositoryService.canUserAccessRepository(curUserId, p.repositoryId, token)
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
