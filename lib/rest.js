var express = require('express')
, config = require('../config')
, url = require('url')
, debug = require('debug')('snow:rest')

module.exports = function() {
    var that = this
    debug('configuring app');

    this.app = express()

    this.app.use(function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*')
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
        res.header('Access-Control-Allow-Headers', 'snow-key,snow-sign,Content-Type')
        return req.method == 'OPTIONS' ? res.send(200) : next()
    })

    this.app.use(express.bodyParser());

/*
    self.app.use(function(req, res, next) {
        debug('added headers')
        res.header('Access-Control-Allow-Headers', 'snow-key, snow-sign')
        return next()
    })
*/

    this.app.use(function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*')
        return next()
    })

    this.app.use(require('./security').verify)

    debug('configuring routes')

    require('./routes')(this.app)

    this.app.use(function(req, res, next) {
        res.status(404)
        res.end('404')
    })

    debug('routes configures')

    var port = process.env.PORT || config.port

    debug('listening on ' + port)
    this.app.listen(port)
}