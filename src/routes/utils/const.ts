export enum COMMON_MSGS {
  ACCESS_DENY = '对不起，您没有访问该数据的权限。 Sorry, you have no access to visit this data.',
}

export const COMMON_ERROR_RES = {
  ERROR_PARAMS: { isOk: false, errMsg: 'Incorrect params.' },
  ACCESS_DENY: { isOk: false, errMsg: 'Access forbidden' },
}