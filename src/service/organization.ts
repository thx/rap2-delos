import seq from '../models/sequelize'
import Pagination from '../routes/utils/pagination'
import Utils from './utils'
export default class OrganizationService {
  public static canUserAccessOrganization(userId: number, organizationId: number): Promise<boolean> {
    const sql = `
      SELECT COUNT(id) AS num FROM (
        SELECT o.id, o.name
        FROM Organizations o
        WHERE visibility = ${1} OR creatorId = ${userId} OR ownerId = ${userId}
        UNION
        SELECT o.id, o.name
        FROM Organizations o
        JOIN organizations_members om ON o.id = om.organizationId
        WHERE om.userId = ${userId}
      ) as result
      WHERE id = ${organizationId}
    `
    return new Promise(resolve => {
      seq.query(sql).spread((result: any) => {
        resolve(+result[0].num > 0)
      })
    })
  }

  public static getAllOrganizationIdList(curUserId: number, pager: Pagination, query?: string): Promise<number[]> {
    if (query) {
      query = Utils.escapeSQL(query)
    }
    const sql = `
      SELECT id FROM (
        SELECT o.id, o.name
        FROM Organizations o
        WHERE visibility = ${1} OR creatorId = ${curUserId} OR ownerId = ${curUserId}
        UNION
        SELECT o.id, o.name
        FROM Organizations o
        JOIN organizations_members om ON o.id = om.organizationId
        WHERE om.userId = ${curUserId}
      ) as result
      ${query ? `WHERE id = '${query}' OR name LIKE '%${query}%'` : ''}
      ORDER BY id desc
      LIMIT ${pager.start}, ${pager.limit}
    `
    return new Promise(resolve => {
      seq.query(sql).spread((result: { id: number }[]) => {
        resolve(result.map(item => item.id))
      })
    })
  }

  public static getAllOrganizationIdListNum(curUserId: number): Promise<number> {
    const sql = `
      SELECT count(*) AS num FROM (
        SELECT o.id, o.name
        FROM Organizations o
        WHERE visibility = ${1} OR creatorId = ${curUserId} OR ownerId = ${curUserId}
        UNION
        SELECT o.id, o.name
        FROM Organizations o
        JOIN organizations_members om ON o.id = om.organizationId
        WHERE om.userId = ${curUserId}
      ) as result
      ORDER BY id desc
    `
    return new Promise(resolve => {
      seq.query(sql).spread((result: { num: number }[]) => {
        resolve(result[0].num)
      })
    })
  }
}