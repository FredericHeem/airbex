var Q = require("q");
var log = require('./log')(__filename)
var debug = log.debug;

module.exports = function (rootDir) {
    "use strict";

    log.info(process.versions);

    var config = require('./Config.js')()
    , createSmtpTransport = require('nodemailer').createTransport
    , express = require('express')
    , app = express()
    , http = require('http')
    , server = http.createServer(app)
    , pg = require('./pg');

    app.config = config
    app.conn = {
        read: config.pg_read_url ? pg(config.pg_read_url, config.pg_native) : {},
        write: config.pg_write_url ? pg(config.pg_write_url, config.pg_native) : {}
    }

    app.myRouter = express.Router();
    app.use(app.myRouter);

    var bodyParser = require('body-parser');
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(bodyParser.json());
    app.use(require('cookie-parser')())

    var EventEmitter = require('events').EventEmitter;
    app.eventEmitter = new EventEmitter();

    app.socketio = require('./socketio')(app, server);
    app.smtp = config.smtp ? createSmtpTransport(config.smtp.service, config.smtp.options) : {}
    app.tarpit = require('./tarpit')()
    app.activity = require('./activity')(app)
    app.validate = require('./validate')
    app.validateWs = require('./validateWs')
    app.email = require('./email')(app)
    //app.ripple = require('./ripple')(app)
    //app.intercom = require('./intercom')
    app.segment = require('./segment')(app)
    app.security = require('./security')(app)
    app.phone = require('./phone')(app)


    // set req.ip and req.ips properly
    app.enable('trust proxy');

    if (module.parent) {
        //app.ripple.remote = {}
    } else {
        app.notify = require('./email/notify')(app)
        app.notifyUserPending = require('./email/notifyUserPending')(app)
        //app.ripple.connect()
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
            log.error(err)
            log.error(err.stack)
            next(err)
        })
    }

    

    app.start = function () {
        debug("start")
        var deferred = Q.defer();
        var cache = app.cache = require('./cache')
        
        debug("start ", app.conn)
        cache(app, app.conn, function(err) {
            if (err) {
                log.error(err);
                return deferred.reject(err);
            }
            
            app.use(function(req, res) {
                log.error("404 for ", req.url)
                res.status(404).end()
            })
            
            debug("listening on port %s", config.port)
            server.listen(config.port, function () {
                log.info("Express server started");
                deferred.resolve();
            });
        })
        return deferred.promise;
    };

    app.stop = function (done) {
        done();
    };

    return app;
};
