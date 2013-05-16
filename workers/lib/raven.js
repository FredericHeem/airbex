var config = require('konfu')

if (config.raven) {
	console.log('adding raven with global patch to %s', config.raven)
	var Raven = require('raven').Client
	, raven = new Raven(config.raven)

	raven.patchGlobal(function() {
		console.error('exiting process (after global patch)')
		process.exit(1)
	})

	module.exports = raven
	return
}

module.exports = {
	captureError: function(err) {
		console.error(err)
		console.error(err.stack)
	}
}
