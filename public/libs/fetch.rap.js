;(function (RAP, fetch) {
  if (!fetch) {
    console.warn('当前环境不支持 fetch')
    return
  }
  if (!RAP) {
    console.warn('请先引入 RAP 插件')
    return
  }

  let next = fetch
  let find = (settings) => {
    for (let repositoryId in RAP.interfaces) {
      for (let itf of RAP.interfaces[repositoryId]) {
        if (itf.method.toUpperCase() === settings.method.toUpperCase() && itf.url === settings.url) {
          return Object.assign({}, itf, { repositoryId })
        }
      }
    }
  }
  window.fetch = function (url, settings) {
    // ajax(settings)
    if (typeof url === 'object') {
      settings = Object.assign({ method: 'GET' }, url)
    } else {
      // ajax(url) ajax(url, settings)
      settings = Object.assign({ method: 'GET' }, settings, { url })
    }

    var match = find(settings)
    if (!match) return next.call(window, url, settings)

    let redirect = `${RAP.protocol}://${RAP.host}/app/mock/${match.repositoryId}/${match.method}/${match.url}`
    settings.credentials = 'include'
    settings.method = 'GET'
    settings.dataType = 'jsonp'
    console.log(`Fetch ${match.method} ${match.url} => ${redirect}`)
    return next.call(window, redirect, settings)
  }
})(window.RAP, window.fetch)
