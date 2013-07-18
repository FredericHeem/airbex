var config = require('konfu')
, nodemailer = require('nodemailer')
, debug = require('debug')('snow:api')
, express = require('express')
, app = module.exports = express()
, http = require('http')
, server = http.createServer(app)

debug('starting api web server')

app.config = config
app.conn = {
    read: require('./db')(config.pg_read_url, config.pg_native),
    write: require('./db')(config.pg_write_url, config.pg_native)
}
app.tarpit = require('./tarpit')()
app.activity = require('./activity')(app)
app.smtp = nodemailer.createTransport(config.smtp.service, config.smtp.options)

debug('config %j', config)

app.use(express.bodyParser())

var routes = ['bitcoincharts', 'v1', 'admin']
routes.forEach(function(name) {
    require('./' + name)(app)
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
cache(module.parent ? null : app.conn, function(err) {
    if (err) throw err
    app.email = require('./email')(app)
    app.ripple = require('./ripple')(app)

    if (!module.parent) {
        app.notify = require('./email/notify')(app)
        app.ripple.connect()
    }

    server.listen(config.port)
    debug('listening on %d', config.port)
})
