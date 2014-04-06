var _ = require('lodash')

module.exports = exports = function(opts) {
    this.opts = _.extend({
        ttl: 60 * 60 * 1000
    }, opts)
    this.sessions = {}
}

exports.prototype.get = function(key, cb) {
    var session = this.sessions[key]
    if (!session) return cb()

    if (session.expires < +new Date()) {
        delete this.sessions[key]
        return cb(null)
    }

    cb(null, session)
}

exports.prototype.create = function(key, val, cb) {
    val.expires = +new Date() + this.opts.ttl
    this.sessions[key] = val
    //console.log(val)
    cb()
}

exports.prototype.extend = function(key, cb) {
    this.get(key, function(err, session) {
        if (err) return cb(err)
        if (!session) return cb(new Error('Session not found'))
        session.expires = +new Date() + this.opts.ttl
        cb()
    }.bind(this))
}

exports.prototype.remove = function(key, cb) {
    if (!this.sessions[key]) return cb(null, false)
    delete this.sessions[key]
    cb(null, true)
}

exports.prototype.update = function(key, val, cb) {
    if (!this.sessions[key]) return cb(new Error('Session not found'))
    this.sessions[key] = val
    cb()
}
