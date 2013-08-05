var async = require('async')
, _ = require('lodash')
, num = require('num')
, hardcoded = {
    BTCNOK: 3,
    BTCUSD: 3,
    BTCLTC: 3,
    BTCXRP: 3,
    BTC: 8,
    USD: 5,
    NOK: 5,
    LTC: 8,
    XRP: 6,
    EUR: 5,
    fiat: {
        'NOK': true,
        'EUR': true,
        'XRP': false,
        'LTC': false,
        'BTC': false
    }
}

module.exports = exports = function(conn, cb) {
    if (!conn) {
        _.extend(exports, hardcoded)
        cb && cb()
        return exports
    }

    async.parallel({
        currencies: function(cb) {
            conn.read.query({
                text: 'SELECT currency_id, scale, fiat FROM currency'
            }, function(err, res) {
                if (err) return cb(err)
                cb(null, res.rows)
            })
        },
        markets: function(cb) {
            conn.read.query([
                'SELECT scale, base_currency_id || quote_currency_id pair',
                'FROM market'
            ].join('\n'), function(err, res) {
                if (err) return cb(err)
                cb(null, res.rows)
            })
        }
    }, function(err, res) {
        if (err) return cb(err)

        res.markets.forEach(function(x) {
            exports[x.pair] = x.scale
        })

        res.markets.forEach(function(x) {
            exports[x.pair] = x.scale
        })

        exports.fiat = {}

        res.currencies.forEach(function(x) {
            exports[x.currency_id] = x.scale
            exports.fiat[x.currency_id] = x.fiat
        })

        cb && cb()
    })

    return exports
}

exports.parseCurrency = function(value, currency) {
    var scale = exports[currency]
    , result = num(value).mul(Math.pow(10, scale))
    result.set_precision(0)
    return result.toString()
}

exports.parseOrderVolume = function(value, marketId) {
    var market = exports[marketId]
    , currency = exports[marketId.substr(0, 3)]
    , result = num(value).mul(Math.pow(10, currency - market))
    result.set_precision(0)
    return result.toString()
}

exports.parseOrderPrice = function(value, marketId) {
    var market = exports[marketId]
    , result = num(value).mul(Math.pow(10, market))
    result.set_precision(0)
    return result.toString()
}

exports.formatCurrency = function(value, currency) {
    var scale = exports[currency]
    return num(value, scale).toString()
}

exports.formatOrderPrice = function(value, market) {
    var scale = exports[market]
    return num(value, scale).toString()
}

exports.formatOrderVolume = function(value, marketId) {
    var market = exports[marketId]
    , currency = exports[marketId.substr(0, 3)]
    return num(value, currency - market).toString()
}
