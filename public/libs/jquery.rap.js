;(function (RAP, jQuery) {
  if (!jQuery) {
    console.warn('请先引入 jQuery')
    return
  }
  if (!RAP) {
    console.warn('请先引入 RAP 插件')
    return
  }

  // 示例：检测重复接口
  let counter = {}
  for (let repositoryId in RAP.interfaces) {
    for (let itf of RAP.interfaces[repositoryId]) {
      let key = `${itf.method} ${itf.url}`
      counter[key] = [...(counter[key] || []), itf]
    }
  }
  for (let key in counter) {
    if (counter[key].length > 1) {
      console.group('警告：检测到重复接口 ' + key)
      counter[key].forEach(itf => {
        console.warn(`#${itf.id} ${itf.method} ${itf.url}`)
      })
      console.groupEnd('警告：检测到重复接口 ' + key)
    }
  }

  let next = jQuery.ajax
  let find = (settings) => {
    for (let repositoryId in RAP.interfaces) {
      for (let itf of RAP.interfaces[repositoryId]) {
        if (itf.method.toUpperCase() === settings.method.toUpperCase() && itf.url === settings.url) {
          return Object.assign({}, itf, { repositoryId })
        }
      }
    }
  }
  jQuery.ajax = function (url, settings) {
    // ajax(settings)
    if (typeof url === 'object') {
      settings = Object.assign({ method: 'GET' }, url)
    } else {
      // ajax(url) ajax(url, settings)
      settings = Object.assign({ method: 'GET' }, settings, { url })
    }

    var match = find(settings)
    if (!match) return next.call(jQuery, url, settings)

    let redirect = `${RAP.protocol}://${RAP.host}/app/mock/${match.repositoryId}/${match.method}/${match.url}`
    settings.method = 'GET'
    settings.dataType = 'jsonp'
    console.log(`jQuery ${match.method} ${match.url} => ${redirect}`)
    return next.call(jQuery, redirect, settings)
  }
})(window.RAP, window.jQuery)
