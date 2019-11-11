import { Repository, RepositoriesMembers } from "../models"
import OrganizationService from "./organization"

export default class RepositoryService {
  public static async canUserAccessRepository(userId: number, repositoryId: number, token?: string): Promise<boolean> {
    const repo = await Repository.findByPk(repositoryId)
    if (token && repo.token === token) return true
    if (!repo) return false
    if (repo.creatorId === userId || repo.ownerId === userId) return true
    const memberExistsNum = await RepositoriesMembers.count({
      where: {
        userId,
        repositoryId,
      }
    })
    if (memberExistsNum > 0) return true
    return OrganizationService.canUserAccessOrganization(userId, repo.organizationId)
  }
}