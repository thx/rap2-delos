export default class Utils {
  public static escapeSQL(str: string) {
    if (typeof str === 'string') {
      str = str.replace(/[\t\r\n]|(--[^\r\n]*)|(\/\*[\w\W]*?(?=\*)\*\/)/gi, '')
      str = str.replace(/['",\.]/ig, '')
      return str
    }
    return ''
  }
}