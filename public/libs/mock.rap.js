;(function (RAP, Mock) {
  if (!RAP) {
    console.warn('请先引入 RAP 插件')
    return
  }
  if (!Mock) {
    console.warn('请先引入 Mock')
    return
  }

  for (let repositoryId in RAP.interfaces) {
    for (let itf of RAP.interfaces[repositoryId]) {
      Mock.mock(itf.url, itf.method.toLowerCase(), (settings) => {
        console.log(`Mock ${itf.method} ${itf.url} =>`, itf.response)
        return Mock.mock(itf.response)
      })
    }
  }
})(window.RAP, window.Mock)
