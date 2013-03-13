var debug = require('debug')('snow:raven')
, config = require('konfu')
, raven

process.on('uncaughtException', function(error) {
	console.error('uncaught exception in process')
	console.error(error)
   	console.error(error.stack)
})

if (process.env.NODE_ENV == 'production') {
	debug('configuring raven with global patch')
	debug('using raven endpoint %s', config.RAVEN)

	raven = new (require('raven').Client)(config.RAVEN)
	raven.patchGlobal(function() {
		debug('exiting process after global exception patch')
		process.exit(1)
	})

	module.exports = raven
} else {
	debug('configuring uncaughtException handler (not in production)')

	process.on('uncaughtException', function(error) {
		module.exports.captureError(error)
	   	process.exit(1)
	})

	module.exports = {
		captureError: function(err) {
			console.error(err)
			console.error(err.stack)
		}
	}
}
