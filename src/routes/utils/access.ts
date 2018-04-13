import OrganizationService from '../../service/organization'
import RepositoryService from '../../service/repository'

export enum ACCESS_TYPE { ORGANIZATION, REPOSITORY, USER }

export class AccessUtils {
  public static async canUserAccess(accessType: ACCESS_TYPE, curUserId: number, entityId: number): Promise<boolean> {
    if (accessType === ACCESS_TYPE.ORGANIZATION) {
      return await OrganizationService.canUserAccessOrganization(curUserId, entityId)
    } else if (accessType === ACCESS_TYPE.REPOSITORY) {
      return await RepositoryService.canUserAccessRepository(curUserId, entityId)
    }
    return false
  }
}