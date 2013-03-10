var _ = require('underscore')
, path = require('path')
, fs = require('fs')
, argv = require('optimist').argv
delete argv.$0
delete argv._

module.exports = {
}

if (typeof process.env.NODE_ENV === 'undefined') {
	var fn = path.join(__dirname, 'config.' + (process.env.NODE_ENV || 'dev'))
	if (fs.existsSync(fn + '.json')) {
		_.extend(module.exports, require(fn + '.json'))
	} else if (fs.existsSync(fn + '.js')) {
		_.extend(module.exports, require(fn + '.js'))
	}
}

_.extend(module.exports, argv)
