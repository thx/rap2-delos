import config from '../config'

let ldap = require('ldapjs')

const ldapclient = ldap.createClient({
  url: config.ldap.url,
})

let ld = function(usr: string, pwd: string) {
  let dn = 'cn=' + usr + ',' + config.ldap.dn
  return new Promise(function(resolve) {
    ldapclient.bind(dn, pwd, function(err: any) {
      if (!err) {
        resolve(1)
      } else {
        resolve(0)
      }
    })
  })
}

export default ld

