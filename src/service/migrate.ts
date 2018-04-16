import { User } from '../models'
import * as md5 from 'md5'
const isMd5 = require('is-md5')

export default class Migrate {
  public static checkAndFix(): void {
    console.log('checkAndFix')
    this.checkPasswordMd5().then()
  }

  public static async checkPasswordMd5() {
    console.log('  checkPasswordMd5')
    const users = await User.findAll()
    if (users.length === 0 || isMd5(users[0].password)) {
      console.log('  users empty or md5 check passed')
      return
    }
    for (const user of users) {
      console.log(`load user ${user.id}`)
      if (!isMd5(user.password)) {
        user.password = md5(md5(user.password))
        user.save().then()
        console.log(`handle user ${user.id}`)
      }
    }
  }
}