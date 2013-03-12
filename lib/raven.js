if (process.env.NODE_ENV == 'production') {
	var raven = require('raven')
	, config = require('../config')
	, client = new raven.Client(config.RAVEN)

	client.patchGlobal(function() {
		process.exit(1)
	})

	module.exports = client
} else {
	process.on('uncaughtException', function (error) {
		console.error('uncaught exception in process')
		console.error(error)
	   	console.error(error.stack)
	   	process.exit(1)
	})

	module.exports = {
		captureError: function(err) {
			console.error(err)
			console.error(err.stack)
		}
	}
}
