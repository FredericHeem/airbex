process.env.DEBUG || (process.env.DEBUG = '.*');

console.log('starting web app');

var config = require('../config');
var app = new (require('../lib/server/App'))(process.env.PORT || config('port'));
