import * as _ from 'lodash'
import { ParameterizedContext } from 'koa'
const inTestMode = process.env.TEST_MODE === 'true'


export async function isLoggedIn(ctx: ParameterizedContext<any, any>, next: () => Promise<any>) {
  if (!inTestMode && (!ctx.session || !ctx.session.id)) {
    ctx.body = {
      isOk: false,
      errMsg: 'need login',
    }
  } else {
    await next()
  }
}