var path = require('path')
, env = process.env.NODE_ENV || 'dev'
module.exports = require('./config.' + env + '.json')
