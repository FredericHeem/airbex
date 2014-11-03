var Q = require("q");
var log = require('./log')(__filename)
var debug = log.debug;
var NotifyWebSocket = require('./email/notifyWebSocket');
var NotifyUserPending = new require('./email/notifyUserPending');
var NotifyEmail = require('./email/notify');

process.on('uncaughtException', function(err) {
    // handle the error safely
    log.error("UncaughtException", err.toString());
});

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
    //app.segment = require('./segment')(app)
    app.security = require('./security')(app)
    app.phone = require('./phone')(app)


    // set req.ip and req.ips properly
    app.enable('trust proxy');

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
    
    function notifyInit(){
        app.notify = new NotifyEmail(app)
        app.notifyUserPending = new NotifyUserPending(app)
        app.notifyWebSocket = new NotifyWebSocket(app);
    }
    
    function notifyStart(){
        app.notify.start();
        app.notifyWebSocket.start();
        app.notifyUserPending.start();
    }
    
    function notifyStop() {
        app.notify.stop();
        app.notifyWebSocket.stop();
        app.notifyUserPending.stop();
    }
    
    function dbConnect(){
        app.conn = {
                read: pg(config.pg_read_url, config.pg_native),
                write: pg(config.pg_write_url, config.pg_native),
                notifyActivity:pg(config.pg_read_url, config.pg_native),
                notifyUserPending:pg(config.pg_read_url, config.pg_native)
            }
    }
    
//    function dbDisconnect(){
//        log.info('dbDisconnect')
//        app.conn.read.disconnect();
//        app.conn.write.disconnect();
//        app.conn.notifyActivity.disconnect();
//        app.conn.notifyUserPending.disconnect();
//    }
    
    app.start = function () {
        log.info('start')
        var deferred = Q.defer();
        var cache = app.cache = require('./cache')
        
        cache(app, app.conn)
        .then(function() {
            
            app.use(function(req, res) {
                log.error("404 for ", req.url)
                res.status(404).end()
            })
            
            debug("listening on port %s", config.port)
            server.listen(config.port, function () {
                log.info("Express server started");
                //console.log("Express server started")
                deferred.resolve();
                notifyStart();
                
            });
        })
        .fail(deferred.reject);
        
        return deferred.promise;
    };

    dbConnect();
    notifyInit();
    //app.init();
    
    
    app.stop = function () {
        log.info('stop')
        var deferred = Q.defer();
        
        notifyStop();
        return Q.delay(10)
        .then(deferred.resolve)
        
    };

    return app;
};
