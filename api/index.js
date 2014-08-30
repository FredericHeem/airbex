if (module.parent && process.env.NODE_ENV != 'travis') {
    process.env.NODE_ENV = 'test'
}

var log = require('./log')(__filename)
debug = log.debug

log.info(process.versions);

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

app.use(express.limit('5mb'));
app.use(express.bodyParser())
app.use(express.cookieParser())

app.smtp = config.smtp ? createSmtpTransport(config.smtp.service, config.smtp.options) : {}
app.tarpit = require('./tarpit')()
app.activity = require('./activity')(app)
app.validate = require('./validate')
app.email = require('./email')(app)
app.ripple = require('./ripple')(app)
app.intercom = require('./intercom')
app.segment = require('./segment')(app)
app.security = require('./security')(app)
app.phone = require('./phone')(app)
app.socketio = require('./socketio')(app, server);

// set req.ip and req.ips properly
app.enable('trust proxy');

if (module.parent) {
    app.ripple.remote = {}
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
cache(app, module.parent ? null : app.conn, function(err) {
    if (err) {
        log.error(err)
    }
    debug("listening on port %s", config.port)
    server.listen(config.port)
})
