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
, log = require('./log')(__filename)
, debug = log.debug

module.exports = exports = function(app, conn, cb) {
    exports.markets = {};
    exports.currencies = {};

    if (!conn) {
        debug("no db connection, use hardcoded")
        _.extend(exports, hardcoded)
        cb && cb()
        return exports
    }

    debug("getting currencies info")
    
    async.parallel({
        currencies: function(cb) {
            conn.read.get().query({
                text: 'SELECT * FROM currency'
            }, function(err, res) {
                debug("query currencies done")
                if (err) return cb(err)
                cb(null, res.rows)
            })
        },
        markets: function(cb) {
            conn.read.get().query([
                'SELECT *',
                'FROM market'
            ].join('\n'), function(err, res) {
                debug("query markets done")
                if (err) return cb(err)
                cb(null, res.rows)
            })
        }
    }, function(err, res) {
        if (err) return cb(err)

        debug("#markets %s", res.markets.length)
        res.markets.forEach(function(x) {
            //debug("market: %s", JSON.stringify(x))
            var marketName = x.name || (x.base_currency_id + x.quote_currency_id);
            exports.markets[marketName] = x
        })
        
        exports.fiat = {}

        debug("#currencies %s", res.currencies.length)
        res.currencies.forEach(function(x) {
            debug("currency: %s", JSON.stringify(x))
            exports.currencies[x.currency_id] = x
            
            if(x.fiat == false){
            	require('./v1/bitcoin')(app, x.currency_id)
            }
            
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
    var scale = exports.currencies[currency].scale
    , result = num(value).mul(Math.pow(10, scale))
    result.set_precision(0)
    return result.toString()
}

exports.parseOrderVolume = function(value, marketId) {
    if (!value.match(numberRegex)) {
        throw new Error('Invalid number format ' + value)
    }
    var scale_base_currency = exports.currencies[exports.getBaseCurrency(marketId)].scale
    
    , result = num(value).mul(Math.pow(10, scale_base_currency))
    result.set_precision(0)
    return result.toString()
}

exports.parseOrderPrice = function(value, marketId) {
    if (!value.match(numberRegex)) {
        throw new Error('Invalid number format ' + value)
    }
    var scale_quote_currency = exports.currencies[exports.getQuoteCurrency(marketId)].scale
    , result = num(value).mul(Math.pow(10, scale_quote_currency))
    result.set_precision(0)
    return result.toString()
}

exports.formatCurrency = function(value, currency) {
    var scale = exports.currencies[currency].scale
    return num(value, scale).toString()
}

exports.formatOrderPrice = function(value, marketId) {
    var scale_quote_currency = exports.currencies[exports.getQuoteCurrency(marketId)].scale
    return num(value, scale_quote_currency).toString()
}

exports.formatOrderVolume = function(value, marketId) {
    var scale_base_currency = exports.currencies[exports.getBaseCurrency(marketId)].scale
    
    return num(value, scale_base_currency).toString()
}

exports.getMarket = function (market_id){
	//debug("market %s, %s", market_id, JSON.stringify(exports.markets[market_id]));
	return exports.markets[market_id];
}

exports.getBaseCurrency = function (market){
	//debug("market %s, %s", market, JSON.stringify(exports.markets[market]))
	return exports.markets[market].base_currency_id
}

exports.getQuoteCurrency = function (market){
	//debug("getQuoteCurrency market %s, %s", market, JSON.stringify(exports.markets[market]))
	return exports.markets[market].quote_currency_id
}

exports.getCurrencyScale = function(currency) {
    return exports.currencies[currency].scale
}

exports.getCurrencyScaleDisplay = function(currency) {
    return exports.currencies[currency].scale_display
}

exports.getCurrencyOption = function(currency) {
    return exports.currencies[currency]
}