var config = require('konfu')
, debug = require('debug')('snow:api')
, express = require('express')
, app = express()
, http = require('http')
, server = http.createServer(app)
, conn = {
    read: require('./db')(config.pg_read_url, config.pg_native),
    write: require('./db')(config.pg_write_url, config.pg_native)
}

debug('starting api web server')

app.config = config
app.conn = conn

debug('config %j', config)

app.use(express.bodyParser())

var routes = ['bitcoincharts', 'v1', 'admin']
routes.forEach(function(name) {
    require('./' + name).configure(app, conn)
})

app.use(function(req, res) {
    res.send(404)
})

if (config.raven) {
    debug('Configuring Raven with %s...', config.raven)

    var raven = require('raven')
    app.use(raven.middleware.express(config.raven))
    debug('Raven middleware added')

    raven = new raven.Client(config.raven)

    raven.patchGlobal(function(logged, err) {
        console.error(err)
        console.error(err.stack)

        console.error('exiting process (after global patch)')
        process.exit(1)
    })

    debug('Raven patched global')
}

var cache = app.cache = require('./cache')
cache(module.parent ? null : conn, function(err) {
    if (err) throw err
    app.email = require('./email')(conn, cache)

    server.listen(config.port)
    debug('listening on %d', config.port)
})
