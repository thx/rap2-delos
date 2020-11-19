export enum COMMON_MSGS {
  ACCESS_DENY = '对不起，您没有访问该数据的权限。 Sorry, you have no access to visit this data.',
}

export const COMMON_ERROR_RES = {
  ERROR_PARAMS: { isOk: false, errMsg: '参数错误' },
  ACCESS_DENY: { isOk: false, errMsg: '您没有访问权限' },
  NOT_LOGIN: { isOk: false, errMsg: '您未登陆，或登陆状态过期。请登陆后重试' },
}

export enum DATE_CONST {
  SECOND = 1000,
  MINUTE = 1000 * 60,
  HOUR = 1000 * 60 * 60,
  DAY = 1000 * 60 * 60 * 24,
  MONTH = 1000 * 60 * 60 * 24 * 30,
  YEAR = 1000 * 60 * 60 * 24 * 365,
}


export enum ENTITY_TYPE {
  REPOSITORY = 0,
  INTERFACE = 1,
  PARAMETER = 2,
}

export enum THEME_TEMPLATE_KEY {
  INDIGO = 'INDIGO', // DEFAULT
  RED = 'RED',
  BLACK = 'BLACK',
  BLUE = 'BLUE',
  GREEN = 'GREEN',
  PINK = 'PINK',
  ORANGE = 'ORANGE',
  PURPLE = 'PURPLE',
  CYAN = 'CYAN',
}

export enum BODY_OPTION {
  FORM_DATA = 'FORM_DATA',
  FORM_URLENCODED = 'FORM_URLENCODED',
  RAW = 'RAW',
  BINARY = 'BINARY',
}