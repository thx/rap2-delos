let pathToRegexp = require('path-to-regexp')

const pkg = {}

pkg.getRelative = url => {
  if (!url || typeof url !== 'string') return null
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

pkg.urlMatchesPattern = (url, pattern) => {
  url = pkg.getRelative(url)
  pattern = pkg.getRelative(pattern)
  let re = pathToRegexp(pattern)
  return re.test(url)
}

module.exports = pkg
