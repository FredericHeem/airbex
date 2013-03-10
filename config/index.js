var _ = require('underscore')
, path = require('path')
, fs = require('fs')
, argv = require('optimist').argv

module.exports = {
}

if (typeof process.env.NODE_ENV === 'undefined') {
	var fn = path.join(__dirname, process.env.NODE_ENV)
	if (fs.existsSync(fn + '.json')) {
		_.extend(module.exports, require(fn + '.json'))
	} else if (fs.existsSync(fn + '.js')) {
		_.extend(module.exports, require(fn + '.js'))
	}
}

_.extend(module.exports, argv)
