import * as schedule from 'node-schedule'
import { Interface } from '../models'
import { Op } from 'sequelize'
import { DATE_CONST } from '../routes/utils/const'

export async function startTask() {

  console.log(`Starting task: locker check`)

  /**
   * 每5分钟检查lock超时
   */
  schedule.scheduleJob('*/5 * * * *', async () => {
    // tslint:disable-next-line: no-null-keyword
    const [num] = await Interface.update({ lockerId: null }, {
      where: {
        lockerId: {
          [Op.gt]: 0,
        },
        updatedAt: {
          [Op.lt]: new Date(Date.now() - DATE_CONST.DAY),
        },
      },
    })

    num > 0 && console.log(`cleared ${num} locks`)
  })
}