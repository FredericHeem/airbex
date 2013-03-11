var _ = require('underscore')
, debug = require('debug')('snow:api:config')
, path = require('path')
, fs = require('fs')
, argv = require('optimist').argv
delete argv.$0
delete argv._

module.exports = _.clone(process.env)

function extendFromFileIfExists(fn) {
	debug('trying to load %s', fn)
	if (!fs.existsSync(fn)) return
	debug('loading from %s', fn)
	_.extend(module.exports, require(fn))
}

[
	'config.' + (process.env.NODE_ENV || 'dev') + '.js',
	'config.' + (process.env.NODE_ENV || 'dev') + '.json',
	'config.json'
]
.map(path.join.bind(path, __dirname))
.forEach(extendFromFileIfExists)

_.extend(module.exports, argv)
