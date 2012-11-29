var restify = require('restify')
, config = require('../config')
, url = require('url')
, debug = require('debug')('snow:rest')
, self = module.exports = function() {
    debug('configuring server');

    self.server = restify.createServer()
    self.server.use(restify.queryParser());
    self.server.use(restify.bodyParser());
    self.server.use(require('./security').verify);

    debug('configuring routes')

    require('./routes').configure(self.server)

    debug('routes configures')

    self.server.on('uncaughtException', function(req, res, route, err) {
        console.error('uncaught exception')
        console.error(err)
        console.error(err.stack)
    })

    self.server.on('after', function(req, res, route, err) {
        if (!err) return
        console.error('error (after)')
        console.error(err)
        console.error(err.stack)
        return true
    })

    var port = process.env.PORT || config('port')

    debug('listening on ' + port)
    self.server.listen(port)
}