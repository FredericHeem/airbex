var async = require('async')
, assert = require('assert')
, num = require('num')
, Cache = module.exports = function(conn, cb) {
    var that = this
    async.parallel({
        currencies: function(cb) {
            conn.read.query({
                text: 'SELECT currency_id, scale FROM currency'
            }, function(err, res) {
                if (err) return cb(err)
                cb(null, res.rows)
            })
        },
        markets: function(cb) {
            conn.read.query({
                text: 'SELECT market_id, scale, base_currency_id || quote_currency_id pair FROM market'
            }, function(err, res) {
                if (err) return cb(err)
                cb(null, res.rows)
            })
        }
    }, function(err, res) {
        if (err) return cb(err)

        that.markets = res.markets.reduce(function(p, c) {
            p[c.pair] = c
            return p
        }, {})

        that.currencies = res.currencies.reduce(function(p, c) {
            p[c.currency_id] = c
            return p
        }, {})

        cb(null, that)
    })
}

Cache.prototype.formatCurrency = function(value, currency) {
    var item = this.currencies[currency]
    assert(item)
    assert(item.scale)
    return num(value, item.scale).toString()
}

Cache.prototype.formatOrderPrice = function(value, market) {
    var item = this.markets[market]
    assert(item, 'no ' + market)
    assert(item.scale)
    return num(value, item.scale).toString()
}

Cache.prototype.formatOrderVolume = function(value, marketId) {
    var market = this.markets[marketId]
    , currency = this.currencies[marketId.substr(0, 3)]
    assert(market)
    assert(currency)
    return num(value, currency.scale - market.scale).toString()
}
