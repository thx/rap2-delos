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
    if (url[0] !== '/') url = '/' + url
    return url
  }

  public static urlMatchesPattern = (url: string, pattern: string) => {
    url = UrlUtils.getRelative(url)
    pattern = UrlUtils.getRelative(pattern)
    console.log(`url=${url} pattern=${pattern}`)
    let re = pathToRegexp(pattern)
    console.log(url, re)
    return re.test(url)
  }

}
