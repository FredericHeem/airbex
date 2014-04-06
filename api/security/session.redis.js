var _ = require('lodash')
, redis = require('redis')
, parseUrl = require('url').parse

module.exports = exports = function(opts) {
    this.opts = _.extend({
        ttl: 60 * 60,
        prefix: 'sessions:'
    }, opts)

    if (opts.uri) {
        var parsedUri = parseUrl(opts.uri)
        this.redis = redis.createClient(parsedUri.port, parsedUri.hostname)

        if (parsedUri.auth) {
            this.redis.auth(parsedUri.auth.split(':')[1])
        }
    } else {
        this.redis = redis.createClient()
    }
}

exports.prototype.get = function(key, cb) {
    this.redis.get(this.opts.prefix + key, function(err, val) {
        if (err) return cb(err)
        cb(null, JSON.parse(val))
    })
}

exports.prototype.create = function(key, val, cb) {
    this.redis.set(this.opts.prefix + key, JSON.stringify(val), cb)
}

exports.prototype.extend = function(key, cb) {
    this.redis.expire(this.opts.prefix + key, this.opts.ttl, cb)
}

exports.prototype.remove = function(key, cb) {
    this.redis.del(this.opts.prefix + key, cb)
}

exports.prototype.update = function(key, val, cb) {
    this.redis.set(this.opts.prefix + key, JSON.stringify(val), cb)
}
