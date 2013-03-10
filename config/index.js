var debug = require('debug')('config')
, _ = require('underscore')
, path = require('path')
, fs = require('fs')
, argv = require('optimist').argv

module.exports = {
}

if (!_.isUndefined(process.env.NODE_ENV)) {
	var fn = path.join(__dirname, process.env.NODE_ENV)
	if (fs.fileExists(fn + '.json')) {
		_.extend(module.exports, require(fn + '.json'))
	} else if (fs.fileExists(fn + '.js')) {
		_.extend(module.exports, require(fn + '.js'))
	}
}

_.extend(module.exports, argv)
