var nconf = require('nconf')
, path = require('path')
, fn = path.join(__dirname, 'config.' + (process.env.NODE_ENV || 'dev') + '.json');
console.log('loading configuration from ' + fn)
nconf.file(fn);
module.exports = nconf.get.bind(nconf);