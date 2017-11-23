/* global $ */
const appendData = (repositoryId, itf, data) => {
  $('#result').append(`<div>
    <strong>#${repositoryId} #${itf.id} ${itf.name} ${itf.method} ${itf.url}</strong>
    <pre>${JSON.stringify(data, null, 2)}</pre>
  </div>`)
}
const doRequest = (RAP, fetch) => { // eslint-disable-line no-unused-vars
  for (let repositoryId in RAP.interfaces) {
    RAP.interfaces[repositoryId].forEach(itf => {
      if (fetch) {
        fetch(itf.url, { method: itf.method })
          .then(res => res.json())
          .then(data => {
            appendData(repositoryId, itf, data)
          })
        return
      }
      $.ajax({ url: itf.url, method: itf.method, dataType: 'json' })
        .done(data => {
          appendData(repositoryId, itf, data)
        })
    })
  }
}
