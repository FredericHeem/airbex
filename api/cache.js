var async = require('async')
, _ = require('lodash')
, num = require('num')
, hardcoded = {
    BTCNOK: 3,
    BTCUSD: 3,
    BTCLTC: 3,
    BTCXRP: 3,
    BTCEUR: 3,
    BTC: 8,
    USD: 5,
    NOK: 5,
    LTC: 8,
    XRP: 6,
    EUR: 5,
    CHF: 5,
    fiat: {
        'NOK': true,
        'EUR': true,
        'XRP': false,
        'LTC': false,
        'BTC': false,
        'USD': true,
        'CHF': true
    }
}
, debug = require('debug')('snow:api:cache')

module.exports = exports = function(conn, cb) {
    if (!conn) {
        debug("no db connection, use hardcoded")
        _.extend(exports, hardcoded)
        cb && cb()
        return exports
    }

    debug("getting currencies info")
    
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

        /*
        debug("#markets %s", res.markets.length)
        res.markets.forEach(function(x) {
            debug("pair: %s scale: %s", x.pair, x.scale)
            exports[x.pair] = x.scale
        })
        */
        exports.fiat = {}

        debug("#currencies %s", res.currencies.length)
        res.currencies.forEach(function(x) {
            debug("currency_id: %s scale: %s, fiat: %s", x.currency_id, x.scale, x.fiat)
            exports[x.currency_id] = x.scale
            exports.fiat[x.currency_id] = x.fiat
        })

        cb && cb()
    })

    return exports
}

var numberRegex = /^[0-9\.]+$/

exports.parseCurrency = function(value, currency) {
    if (!value.match(numberRegex)) {
        throw new Error('Invalid number format ' + value)
    }
    var scale = exports[currency]
    , result = num(value).mul(Math.pow(10, scale))
    result.set_precision(0)
    return result.toString()
}

exports.parseOrderVolume = function(value, marketId) {
    if (!value.match(numberRegex)) {
        throw new Error('Invalid number format ' + value)
    }
    var scale_base_currency = exports[marketId.substr(0, 3)]
    , result = num(value).mul(Math.pow(10, scale_base_currency))
    result.set_precision(0)
    return result.toString()
}

exports.parseOrderPrice = function(value, marketId) {
    if (!value.match(numberRegex)) {
        throw new Error('Invalid number format ' + value)
    }
    var scale_quote_currency = exports[marketId.substr(3)]
    , result = num(value).mul(Math.pow(10, scale_quote_currency))
    result.set_precision(0)
    return result.toString()
}

exports.formatCurrency = function(value, currency) {
    var scale = exports[currency]
    return num(value, scale).toString()
}

exports.formatOrderPrice = function(value, marketId) {
    var scale_quote_currency = exports[marketId.substr(3)]
    return num(value, scale_quote_currency).toString()
}

exports.formatOrderVolume = function(value, marketId) {
    var scale_base_currency = exports[marketId.substr(0, 3)]
    return num(value, scale_base_currency).toString()
}
