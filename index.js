var debug = require('debug')('snow')
, url = require('url')
, request = require('request')
, util = require('util')
, Snow = module.exports = function(key, ep) {
    var u = url.parse(ep || 'https://snowco.in/api')
    u.auth = 'api:' + key
    this.url = url.format(u)
}

Snow.prototype.orders = function(cb) {
    request(this.url + 'orders', {
        json: true
    }, function(err, res, body) {
        if (res.statusCode !== 200) throw new Error(body)
        cb(err, body)
    })
}

Snow.prototype.markets = function(cb) {
    request(this.url + 'markets', {
        json: true
    }, function(err, res, body) {
        if (res.statusCode !== 200) throw new Error(body)
        cb(err, body)
    })
}

Snow.prototype.depth = function(market, cb) {
    request(this.url + 'markets/' + market + '/depth', {
        json: true
    }, function(err, res, body) {
        if (res.statusCode !== 200) throw new Error(body)
        cb(err, body)
    })
}

Snow.prototype.cancel = function(id, cb) {
    request(this.url + 'orders/' + id, {
        method: 'DELETE',
        json: true,
    }, function(err, res, body) {
        if (err) return cb(err)
        if (res.statusCode === 204) return cb()
        if (res.statusCode === 400) return cb(new Error('Order ' + id + ' not found'))
        cb(new Error(body))
    })
}

Snow.prototype.order = function(order, cb) {
    request(this.url + 'orders', {
        json: order,
        method: 'POST'
    }, function(err, res, body) {
        if (err) return cb(err)
        if (res.statusCode === 201) return cb(null, body.id)
        cb(new Error(util.inspect(body)))
    })
}
