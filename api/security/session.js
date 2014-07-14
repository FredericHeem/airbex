var debug = require('debug')('snow:security:session')
, crypto = require('crypto')
, assert = require('assert')
, MemoryStore = require('./session.memory')
, RedisStore = require('./session.redis')
, _ = require('lodash')

module.exports = exports = function(app) {
    exports.app = app

    var storeType = !app.config.session || !app.config.session.type ?
        'memory' :
        app.config.session.type

    if (storeType == 'memory') {
        exports.store = new MemoryStore()
    } else if (storeType == 'redis') {
        exports.store = new RedisStore({
            uri: app.config.session.uri
        })
    }

    app.userToken = {};
    
    app.use(exports.handler)
    return exports
}

// Extract and validate session, if present
exports.handler = function(req, res, next) {
    if (!req.cookies.session) return next()

    exports.store.get(req.cookies.session, function(err, session) {
        if (err) return next(err)
        if (!session) {
            debug("401 SessionNotFound for ip: %s", req.ip);
            return res.send(401, {
                name: 'SessionNotFound',
                message: 'The specified session could not be found'
            })
        }
        req.session = session

        exports.app.security.users.fromUserId(session.userId, function(err, user) {
            if (err) return next(err)
            if(!user) {
                return res.send(401, {
                    name: 'SessionNotFound',
                    message: 'User not found in session'
                })
            }
            
            req.user = user;

            debug('session attached (user #%d)', user.id)
            next()
        })
    })
}

function pretty(id) {
    return id.substr(0, 4)
}

exports.extend = function(key, cb) {
    exports.store.extend(key, cb)
}

exports.create = function(req, email, cb) {
    var ip = req.headers['x-real-ip'];
    debug('create: finding user %s to create session from ip: %s', email, ip)

    exports.app.security.users.fromEmail(email, function(err, user) {
        if (err) return cb(err)

        var serverSalt = exports.randomSha256()

        function respondWithDelay() {
            setTimeout(function() {
                cb(null, serverSalt)
            }, Math.floor(Math.random() * 100))
        }

        if (user) {
            assert(user.primaryKey)
            debug('creating session key with user pk %s', user.primaryKey)
            var key = exports.getSessionKey(serverSalt, user.primaryKey)
            exports.app.activity(user.id, 'Login', {"ip": ip});
            
            return exports.store.create(key, {
                userId: user.id
            }, respondWithDelay)
        } else {
            debug('no user for email %s', email);
        }

        respondWithDelay()
    })
}

exports.getSessionKey = function(serverSalt, userKey) {
    var hash = crypto.createHash('sha256')
    hash.update(serverSalt)
    hash.update(userKey)
    var res = hash.digest('hex')
    debug('getSessionKey: created session key %s from server salt %s + user key %s',
        pretty(res), pretty(serverSalt), pretty(userKey))
    return res
}

exports.randomSha256 = function() {
    var hash = crypto.createHash('sha256')
    hash.update(crypto.randomBytes(8))
    return hash.digest('hex')
}

exports.remove = function(key, cb) {
    exports.store.remove(key, cb)
}

exports.update = function(key, session, cb) {
    debug('updating session...')
    exports.store.update(key, session, cb)
}
