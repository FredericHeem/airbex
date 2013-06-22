var config = require('konfu')

if (config.raven) {
	console.log('adding raven with global patch to %s', config.raven)
	var Raven = require('raven').Client
	, raven = new Raven(config.raven)

	raven.patchGlobal(function(logged, err) {
        console.error(err)
        console.error(err.stack)

		console.error('exiting process (after global patch)')
		process.exit(1)
	})

	module.exports = raven
	return
}

module.exports = {
	captureException: function(err) {
		console.error(err)
		console.error(err.stack)
	},

	captureMessage: function(message) {
		console.log(message)
	}
}
