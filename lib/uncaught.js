process.on('uncaughtException', function (error) {
	console.error('uncaught exception in process')
	console.error(error)
   	console.error(error.stack)
   	process.exit(error.code || 1)
})
