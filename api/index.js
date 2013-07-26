if (module.parent && process.env.NODE_ENV != 'travis') {
    process.env.NODE_ENV = 'test'
}

var config = require('konfu')
, createSmtpTransport = require('nodemailer').createTransport
, express = require('express')
, app = module.exports = express()
, http = require('http')
, server = http.createServer(app)
, pg = require('./pg')

app.config = config
app.conn = {
    read: config.pg_read_url ? pg(config.pg_read_url, config.pg_native) : {},
    write: config.pg_write_url ? pg(config.pg_write_url, config.pg_native) : {}
}

app.smtp = config.smtp ? createSmtpTransport(config.smtp.service, config.smtp.options) : {}
app.tarpit = require('./tarpit')()
app.activity = require('./activity')(app)
app.auth = require('./auth')
app.validate = require('./validate')
app.email = require('./email')(app)
app.ripple = require('./ripple')(app)
app.tropo = require('./tropo')(app)
app.verifyEmail = require('./verifyemail')
app.use(express.bodyParser())
app.apiKeys = {}

if (module.parent) {
    app.ripple.drop = {}
} else {
    app.notify = require('./email/notify')(app)
    app.ripple.connect()
}

var routes = ['bitcoincharts', 'v1', 'admin']
routes.forEach(function(name) {
    require('./' + name)(app)
})

if (config.raven) {
    var raven = require('raven')
    app.use(raven.middleware.express(config.raven))

    raven = new raven.Client(config.raven)
    raven.patchGlobal(function(logged, err) {
        console.error(err)
        console.error(err.stack)

        console.error('exiting process (after global patch)')
        process.exit(1)
    })
} else {
    app.use(function(err, req, res, next) {
        console.error(err)
        console.error(err.stack)
        next(err)
    })
}

app.use(function(req, res) {
    res.send(404)
})

var cache = app.cache = require('./cache')
cache(module.parent ? null : app.conn, function(err) {
    if (err) throw err
    server.listen(config.port)
})
