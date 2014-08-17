var log = require('../log')(__filename)
, debug = log.debug
var _ = require('lodash');

module.exports = exports = function(app) {
    exports.app = app
    app.post('/security/session', exports.create)
    app.del('/security/session', exports.remove)
}

exports.create = function(req, res, next) {
    if (!req.app.validate(req.body, 'v1/session_create', res)) {
        debug("create invalid request")
        return;
    }
    var email = req.body.email.toLowerCase()
    
    exports.app.security.session.create(req, email, function(err, sid) {
        if (err) return next(err)
        debug("create session from email: %s, sid: %s", email, sid)
        res.send(201, {
            id: sid
        })
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
