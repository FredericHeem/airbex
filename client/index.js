var debug = require('debug')('snow')
, assert = require('assert')
, request = require('request')
, Snow = module.exports = function(key, ep) {
    this.url = ep || 'https://justcoin.com/api/v1/'
    debug('using endpoint %s', ep)

    this.key = key
}

function bodyToError(body) {
    assert(body)
    var error = new Error(body.message || body)
    if (body.name) error.name = body.name
    return error
}

Snow.prototype.orders = function(cb) {
    request(this.url + 'orders', {
        json: true,
        qs: {
            key: this.key
        }
    }, function(err, res, body) {
        if (err) return cb(err)
        if (res.statusCode !== 200) {
            debug('status code %s from orders', res.statusCode)
            debug(JSON.stringify(body))
            return cb(bodyToError(body))
        }
        cb(null, body)
    })
}

Snow.prototype.markets = function(cb) {
    request(this.url + 'markets', {
        json: true
    }, function(err, res, body) {
        if (err) return cb(err)
        if (res.statusCode !== 200) return cb(bodyToError(body))
        cb(err, body)
    })
}

// Groups depth from array to bids and asks
Snow.prototype.depth = function(market, cb) {
    request(this.url + 'markets/' + market + '/depth', {
        json: true
    }, function(err, res, body) {
        if (err) return cb(err)
        if (res.statusCode !== 200) return cb(bodyToError(body))
        cb(null, body)
    })
}

Snow.prototype.cancel = function(id, cb) {
    request(this.url + 'orders/' + id, {
        method: 'DELETE',
        json: true,
        qs: {
            key: this.key
        }
    }, function(err, res, body) {
        if (err) return cb(err)
        if (res.statusCode === 404) return cb(new Error('Order ' + id + ' not found'))
        if (res.statusCode != 204) return cb(bodyToError(body))
        cb()
    })
}

Snow.prototype.order = function(order, cb) {
    request(this.url + 'orders', {
        json: order,
        method: 'POST',
        qs: {
            key: this.key
        }
    }, function(err, res, body) {
        if (err) return cb(err)
        if (res.statusCode !== 201) return cb(bodyToError(body))
        cb(null, body.id)
    })
}
