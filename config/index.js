// local or development or production
module.exports =
    (process.env.NODE_ENV === 'local' && require('./config.local')) ||
    (process.env.NODE_ENV === 'development' && require('./config.dev')) ||
    require('./config.prod')
