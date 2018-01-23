let pathToRegexp = require('path-to-regexp')

export default class UrlUtils {

  public static getRelative = (url: string) => {
    url = url.toLowerCase()
    const prefixes = ['https://', 'http://']
    for (let item of prefixes) {
      if (url.indexOf(item) > -1) {
        url = url.substring(item.length)
        if (url.indexOf('/') > -1) {
          url = url.substring(url.indexOf('/'))
        } else {
          url = '/'
        }
        break
      }
    }
    if (url.indexOf('?') > -1) {
      url = url.substring(0, url.indexOf('?'))
    }
    return url
  }

  public static urlMatchesPattern = (url: string, pattern: string) => {
    url = UrlUtils.getRelative(url)
    pattern = UrlUtils.getRelative(pattern)
    let re = pathToRegexp(pattern)
    return re.test(pattern)
  }

}
