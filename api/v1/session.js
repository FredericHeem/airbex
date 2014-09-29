var log = require('../log')(__filename)
, debug = log.debug
var _ = require('lodash');

module.exports = exports = function(app) {
    exports.app = app
    app.post('/security/session', exports.createRest)
    app.delete('/security/session', exports.remove)
    
    app.socketio.router.on("/v1/sessionCreate", exports.createWs);
}

var _create = function(app, sessionParam, ip, cb) {
    var error = app.validateWs(sessionParam, 'v1/session_create');
    if(error){
        return cb(error);
    }

    var email = sessionParam.email.toLowerCase()
    
    exports.app.security.session.create(email, ip, function(err, sid) {
        if (err) return cb(err)
        debug("create session from email: %s, sid: %s", email, sid)
        cb(null, {id: sid})
    })
}

exports.createWs = function(client, eventName, data, next) {
    var ip = client.handshake.headers['x-real-ip'] || '127.0.0.1';
    log.debug('sessionCreate from ip', ip);
    log.debug('headers ', client.handshake.headers);
    var callbackId = exports.app.socketio.callbackId(data);
    var inputs = data ? data.inputs : undefined;
    _create(exports.app, inputs, ip, function(err, response){
        if(err) return next(err)
        client.emit('/v1/sessionCreate',  {callbackId: callbackId, data:response})
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
