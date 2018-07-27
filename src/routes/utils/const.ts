export enum COMMON_MSGS {
  ACCESS_DENY = '对不起，您没有访问该数据的权限。 Sorry, you have no access to visit this data.',
}

export const COMMON_ERROR_RES = {
  ERROR_PARAMS: { isOk: false, errMsg: '参数错误' },
  ACCESS_DENY: { isOk: false, errMsg: '您没有访问权限' },
  NOT_LOGIN: { isOk: false, errMsg: '您未登陆，或登陆状态过期。请登陆后重试' },
}