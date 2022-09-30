import * as svgCaptcha from 'svg-captcha'
import { User, Notification, Logger, Organization, Repository } from '../models'
import router from './router'
import { Model } from 'sequelize-typescript'
import Pagination from './utils/pagination'
import { QueryInclude } from '../models'
import { Op } from 'sequelize'
import MailService from '../service/mail'
import * as md5 from 'md5'
import { isLoggedIn } from './base'
import { AccessUtils } from './utils/access'
import { COMMON_ERROR_RES } from './utils/const'
import * as moment from 'moment'
import RedisService, { CACHE_KEY, DEFAULT_CACHE_VAL } from '../service/redis'




router.get('/app/get', async (ctx, next) => {
  let data: any = {}
  let query = ctx.query
  let hooks: any = {
    user: User,
  }
  for (let name in hooks) {
    if (!query[name]) continue
    data[name] = await hooks[name].findByPk(query[name], {
      attributes: { exclude: [] }
    })
  }
  ctx.body = {
    data: Object.assign({}, ctx.body && ctx.body.data, data),
  }

  return next()
})

router.get('/account/count', async (ctx) => {
  ctx.body = {
    data: await User.count(),
  }
})

router.get('/account/list', isLoggedIn, async (ctx) => {
  // if (!AccessUtils.isAdmin(ctx.session.id)) {
  //   ctx.body = COMMON_ERROR_RES.ACCESS_DENY
  //   return
  // }
  let where = {}
  let { name } = ctx.query
  if (name) {
    Object.assign(where, {
      [Op.or]: [
        { fullname: { [Op.like]: `%${name}%` } },
        { email: name },
      ],
    })
  }
  let options = { where }
  let total = await User.count(options)
  let limit = Math.min(+ctx.query.limit ?? 10, 100)
  let pagination = new Pagination(total, ctx.query.cursor || 1, limit)
  ctx.body = {
    data: await User.findAll({
      ...options, ...{
        attributes: ['id', 'fullname', 'email'],
        offset: pagination.start,
        limit: pagination.limit,
        order: [['id', 'DESC']],
      }
    }),
    pagination: pagination
  }
})

router.get('/account/info', async (ctx) => {
  ctx.body = {
    data: ctx.session.id ? await User.findByPk(ctx.session.id, {
      attributes: QueryInclude.User.attributes
    }) : undefined
  }
})

router.post('/account/login', async (ctx) => {
  let { email, password, captcha } = ctx.request.body
  let result, errMsg
  if (process.env.TEST_MODE !== 'true' &&
    (!captcha || !ctx.session.captcha || captcha.trim().toLowerCase() !== ctx.session.captcha.toLowerCase())) {
    errMsg = '错误的验证码'
  } else {
    result = await User.findOne({
      attributes: QueryInclude.User.attributes,
      where: { email, password: md5(md5(password)) },
    })
    if (result) {
      ctx.session.id = result.id
      ctx.session.fullname = result.fullname
      ctx.session.email = result.email
      let app: any = ctx.app
      app.counter.users[result.fullname] = true
    } else {
      errMsg = '账号或密码错误'
    }
  }
  ctx.body = {
    data: result ? result : { errMsg },
  }
})

router.get('/captcha_data', ctx => {
  ctx.body = {
    data: JSON.stringify(ctx.session)
  }
})

router.get('/account/logout', async (ctx) => {
  let app: any = ctx.app
  delete app.counter.users[ctx.session.email]
  let id = ctx.session.id
  Object.assign(ctx.session, { id: undefined, fullname: undefined, email: undefined })
  ctx.body = {
    data: await { id },
  }
})

router.post('/account/register', async (ctx) => {
  let { fullname, email, password } = ctx.request.body
  let exists = await User.findAll({
    where: { email },
  })
  if (exists && exists.length) {
    ctx.body = {
      data: {
        isOk: false,
        errMsg: '该邮件已被注册，请更换再试。',
      },
    }
    return
  }

  // login automatically after register
  let result = await User.create({ fullname, email, password: md5(md5(password)) })

  if (result) {
    ctx.session.id = result.id
    ctx.session.fullname = result.fullname
    ctx.session.email = result.email
    let app: any = ctx.app
    app.counter.users[result.fullname] = true
  }

  ctx.body = {
    data: {
      id: result.id,
      fullname: result.fullname,
      email: result.email,
    },
  }
})

router.post('/account/update', async (ctx) => {
  const { password } = ctx.request.body
  let errMsg = ''
  let isOk = false

  if (!ctx.session || !ctx.session.id) {
    errMsg = '登陆超时'
  } else if (password.length < 6) {
    errMsg = '密码长度过短'
  } else {
    const user = await User.findByPk(ctx.session.id)
    user.password = md5(md5(password))
    await user.save()
    isOk = true
  }
  ctx.body = {
    data: {
      isOk,
      errMsg
    }
  }
})

router.get('/account/remove', isLoggedIn, async (ctx) => {
  if (!AccessUtils.isAdmin(ctx.session.id)) {
    ctx.body = COMMON_ERROR_RES.ACCESS_DENY
    return
  }
  if (process.env.TEST_MODE === 'true') {
    ctx.body = {
      data: await User.destroy({
        where: { id: ctx.query.id },
      }),
    }
  } else {
    ctx.body = {
      data: {
        isOk: false,
        errMsg: 'access forbidden',
      },
    }
  }
})

// TODO 2.3 账户设置
router.get('/account/setting', async (ctx) => {
  ctx.body = {
    data: {},
  }
})

router.post('/account/setting', async (ctx) => {
  ctx.body = {
    data: {},
  }
})

router.post('/account/fetchUserSettings', isLoggedIn, async (ctx) => {
  const keys: CACHE_KEY[] = ctx.request.body.keys
  if (!keys || !keys.length) {
    ctx.body = {
      isOk: false,
      errMsg: 'error'
    }
    return
  }

  const data: { [key: string]: string } = {}

  for (const key of keys) {
    data[key] = await RedisService.getCache(key, ctx.session.id) || DEFAULT_CACHE_VAL[key]
  }

  ctx.body = {
    isOk: true,
    data,
  }
})

router.post('/account/updateUserSetting/:key', isLoggedIn, async (ctx) => {
  const key: CACHE_KEY = ctx.params.key as CACHE_KEY
  const value: string = ctx.request.body.value
  await RedisService.setCache(key, value, ctx.session.id, 10 * 365 * 24 * 60 * 60)
  ctx.body = {
    isOk: true,
  }
})

// TODO 2.3 账户通知
let NOTIFICATION_EXCLUDE_ATTRIBUTES: any = []
router.get('/account/notification/list', async (ctx) => {
  let total = await Notification.count()
  let pagination = new Pagination(total, ctx.query.cursor || 1, ctx.query.limit || 10)
  ctx.body = {
    data: await Notification.findAll({
      attributes: { exclude: NOTIFICATION_EXCLUDE_ATTRIBUTES },
      offset: pagination.start,
      limit: pagination.limit,
      order: [
        ['id', 'DESC'],
      ],
    }),
    pagination: pagination,
  }
})

router.get('/account/notification/unreaded', async (ctx) => {
  ctx.body = {
    data: [],
  }
})

router.post('/account/notification/unreaded', async (ctx) => {
  ctx.body = {
    data: 0,
  }
})

router.post('/account/notification/read', async (ctx) => {
  ctx.body = {
    data: 0,
  }
})

// TODO 2.3 账户日志
router.get('/account/logger', async (ctx) => {
  if (!ctx.session.id) {
    ctx.body = {
      data: {
        isOk: false,
        errMsg: 'not login'
      }
    }
    return
  }
  let auth = await User.findByPk(ctx.session.id)
  let repositories: Model<Repository>[] = [...(<Model<Repository>[]>await auth.$get('ownedRepositories')), ...(<Model<Repository>[]>await auth.$get('joinedRepositories'))]
  let organizations: Model<Organization>[] = [...(<Model<Organization>[]>await auth.$get('ownedOrganizations')), ...(<Model<Organization>[]>await auth.$get('joinedOrganizations'))]

  let where: any = {
    [Op.or]: [
      { userId: ctx.session.id },
      { repositoryId: repositories.map(item => item.id) },
      { organizationId: organizations.map(item => item.id) },
    ],
  }
  let total = await Logger.count({ where })
  let pagination = new Pagination(total, ctx.query.cursor || 1, ctx.query.limit || 100)
  let logs = await Logger.findAll({
    where,
    attributes: {},
    include: [
      Object.assign({}, QueryInclude.Creator, { required: false }),
      QueryInclude.User,
      QueryInclude.Organization,
      QueryInclude.Repository,
      QueryInclude.Module,
      QueryInclude.Interface,
    ],
    offset: pagination.start,
    limit: pagination.limit,
    order: [
      ['id', 'DESC'],
    ],
    paranoid: false,
  } as any)

  ctx.body = {
    data: logs,
    pagination,
  }
})

router.get('/captcha', async (ctx) => {
  const captcha = svgCaptcha.create()
  ctx.session.captcha = captcha.text
  ctx.set('Content-Type', 'image/svg+xml')
  ctx.body = captcha.data
})

router.get('/worker', async (ctx) => {
  ctx.body = process.env.NODE_APP_INSTANCE || 'NOT FOUND'
})

router.post('/account/reset', async (ctx) => {
  const email = ctx.request.body.email
  const password = ctx.request.body.password
  if (password && ctx.session.resetCode && password === ctx.session.resetCode + '') {
    const newPassword = String(Math.floor(Math.random() * 99999999))
    const user = await User.findOne({ where: { email } })
    if (!user) {
      ctx.body = {
        data: {
          isOk: false,
          errMsg: '您的邮箱没被注册过。',
        }
      }
      return
    }
    user.password = md5(md5(newPassword))
    await user.save()
    ctx.body = {
      data: {
        isOk: true,
        data: newPassword,
      }
    }
  } else {
    const resetCode = ctx.session.resetCode = Math.floor(Math.random() * 999999)
    MailService.send(email, 'RAP重置账户验证码', `您的验证码为：${resetCode}`)
    ctx.body = {
      data: {
        isOk: true,
      }
    }
  }
})

router.post('/account/findpwd', async (ctx) => {
  let { email, captcha } = ctx.request.body
  let user, errMsg
  if (process.env.TEST_MODE !== 'true' &&
    (!captcha || !ctx.session.captcha || captcha.trim().toLowerCase() !== ctx.session.captcha.toLowerCase())) {
    errMsg = '错误的验证码'
  } else {
    user = await User.findOne({
      attributes: QueryInclude.User.attributes,
      where: { email },
    })
    if (user) {
      // 截取ID最后两位*日期字符串 作为返回链接的过期校验
      let idstr = user.id.toString()
      let timeCode = (parseInt(moment().add(60, 'minutes').format('YYMMDDHHmmss')) * parseInt(idstr.substr(idstr.length - 2))).toString()
      let token = md5(user.email + user.id + timeCode + String(Math.floor(Math.random() * 99999999)))
      await RedisService.setCache(CACHE_KEY.PWDRESETTOKEN_GET, token, user.id)
      let link = `${ctx.headers.origin}/account/resetpwd?code=${timeCode}&email=${email}&token=${token}`
      let content = MailService.mailFindpwdTemp.replace(/{=EMAIL=}/g, user.email).replace(/{=URL=}/g, link).replace(/{=NAME=}/g, user.fullname)
      MailService.send(email, "RAP2：重新设置您的密码", content)
    } else {
      errMsg = '账号不存在'
    }
  }
  ctx.body = {
    data: !errMsg ? { isOk: true } : { isOk: false, errMsg }
  }
})

router.post('/account/findpwd/reset', async (ctx) => {
  let { code, email, captcha, token, password } = ctx.request.body
  let user, errMsg
  if (!code || !email || !captcha || !token || !password) {
    errMsg = '参数错误'
  }
  else if (password.length < 6) {
    errMsg = '密码长度过短'
  }
  else if (process.env.TEST_MODE !== 'true' &&
    (!captcha || !ctx.session.captcha || captcha.trim().toLowerCase() !== ctx.session.captcha.toLowerCase())) {
    errMsg = '错误的验证码'
  } else {
    user = await User.findOne({
      attributes: QueryInclude.User.attributes,
      where: { email },
    })
    if (!user) {
      errMsg = '您的邮箱没被注册过，或用户已被锁定'
    }
    else {
      const tokenCache = await RedisService.getCache(CACHE_KEY.PWDRESETTOKEN_GET, user.id)
      if (!tokenCache || tokenCache !== token) {
        errMsg = "参数错误"
      }
      else {
        RedisService.delCache(CACHE_KEY.PWDRESETTOKEN_GET, user.id)
        let idstr = user.id.toString()
        let timespan = parseInt(code) / parseInt(idstr.substr(idstr.length - 2))
        if (timespan < parseInt(moment().format('YYMMDDHHmmss'))) {
          errMsg = "此链接已超时，请重新发送重置密码邮件"
        }
        else {
          user.password = md5(md5(password))
          await user.save()
        }
      }
    }
  }
  ctx.body = {
    data: !errMsg ? { isOk: true } : { isOk: false, errMsg }
  }
})

router.post('/account/updateAccount', async ctx => {
  try {
    const { password, fullname } = ctx.request.body as { password: string, fullname: string }
    if (!ctx.session?.id) {
      throw new Error('需先登录才能操作')
    }
    const user = await User.findByPk(ctx.session.id)
    if (password) {
      user.password = md5(md5(password))
    }
    if (fullname) {
      user.fullname = fullname
    }
    await user.save()
    ctx.body = {
      isOk: true
    }
  } catch (ex) {
    ctx.body = {
      isOk: false,
      errMsg: ex.message,
    }
  }
})
