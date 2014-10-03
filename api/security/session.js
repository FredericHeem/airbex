var log = require('../log')(__filename)
, debug = log.debug
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
            uri: app.config.session.uri,
            prefix: 'sessions:'
        })
    }

    app.userToken = {};
    
    app.use(exports.handler)
    return exports
}

// Extract and validate session, if present

exports.getUserAndSessionFromSessionKey = function(sessionKey, cb) {
    if(!sessionKey) return cb(null, null);
    //debug("getUserAndSessionFromSessionKey: ", sessionKey);
    exports.store.get(sessionKey, function(err, session) {
        if (err) return cb(err)
        if (!session) {
            debug("SessionNotFound");
            return cb({
                name: 'SessionNotFound',
                message: 'The specified session could not be found'
            })
        }

        exports.app.security.users.fromUserId(session.userId, function(err, user) {
            if (err) return cb(err)
            if(!user) {
                return cb({
                    name: 'SessionNotFound',
                    message: 'User not found in session'
                })
            }

            //debug('session attached (user #%d)', user.id)
            cb(null, {session: session, user: user});
        })
    })
}

exports.handler = function(req, res, next) {
    exports.getUserAndSessionFromSessionKey(req.cookies.session, function(err, response){
        if(err) {
            return res.status(401).send(err);
        } else if(response){
            req.session = response.session
            req.user = response.user;
        }
        
        next()
    })
}

function pretty(id) {
    return id.substr(0, 4)
}

exports.extend = function(key, cb) {
    exports.store.extend(key, cb)
}

exports.create = function(email, ip, cb) {
    debug('create: finding user %s to create session', email)

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
