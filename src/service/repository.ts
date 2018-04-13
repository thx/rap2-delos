import { Repository } from "../models"
import OrganizationService from "./organization";

export default class RepositoryService {
  public static async canUserAccessRepository(userId: number, repositoryId: number): Promise<boolean> {
    const repo = await Repository.findById(repositoryId, { attributes: ['organizationId']})
    return OrganizationService.canUserAccessOrganization(userId, repo.organizationId)
  }
}