var log = require('../log')(__filename)
, debug = log.debug
var _ = require('lodash');

module.exports = exports = function(app) {
    exports.app = app
    app.post('/security/session', exports.createRest)
    app.del('/security/session', exports.remove)
    
    app.socketio.router.on("sessionCreate", exports.createWs);
}

var _create = function(app, sessionParam, ip, cb) {
    // TODO
//    if (!app.validate(sessionParam, 'v1/session_create', res)) {
//        return cb({error:"InvalidRequest"})
//    }
    
    var email = sessionParam.email.toLowerCase()
    
    exports.app.security.session.create(email, ip, function(err, sid) {
        if (err) return cb(err)
        debug("create session from email: %s, sid: %s", email, sid)
        cb(null, {id: sid})
    })
}

exports.createWs = function(client, args, next) {
    var ip = "UnknowIp";
    log.debug('sessionCreate from ip', ip);
    _create(exports.app, args[1], ip, function(err, response){
        if(err) return next(err)
        client.emit('sessionCreate', response)
    })
}

exports.createRest = function(req, res, next) {
    var ip = req.headers['x-real-ip'] || "???";
    _create(req.app, req.body, ip, function(err, response){
        if(err) return next(err)
        res.send(201, response);
    })
}

exports.remove = function(req, res, next) {
    if (!req.session) {
        return res.send(400, {
            name: 'NoSession',
            message: 'No session cookie was passed'
        })
    }

    exports.app.security.session.remove(req.cookies.session, function(err) {
        if (err) return next(err)
        res.send(204)
    })
}
