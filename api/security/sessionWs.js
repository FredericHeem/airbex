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

    if (storeType == 'redis') {
        exports.store = new RedisStore({
            uri: app.config.session.uri,
            prefix: 'wsSessions:'
        })
    } else {
        exports.store = new MemoryStore()
    }

    return exports
}

exports.extend = function(key, cb) {
    exports.store.extend(key, cb)
}

exports.create = function(userId, socketId, cb) {
    debug('create user: %s, socketId: %s', userId, socketId);
    return exports.store.create(userId, {
        socketId: socketId
    }, cb);
}

exports.getSocketId = function(userId, cb) {
    if(!userId) return cb(null, null);
    debug("getSocketId: uid: ", userId);
    exports.store.get(userId, function(err, item) {
        if (err) return cb(err)
        var socketId = item
        if (!item) {
            debug("SocketIdNotFound");
            return cb({
                name: 'SocketIdNotFound',
                message: 'The socket id could not be found'
            })
        }
        debug("getSocketId: ", item.socketId);
        cb(null, item.socketId);
    })
}
exports.remove = function(key, cb) {
    exports.store.remove(key, cb)
}

exports.update = function(key, session, cb) {
    debug('updating session...')
    exports.store.update(key, session, cb)
}
