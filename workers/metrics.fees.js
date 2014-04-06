var debug = require('debug')('snow:metrics:fees')
, analytics = require('analytics-node')
, async = require('async')
, Client = require('pg').Client
, EventEmitter = require('events').EventEmitter
, util = require('util')
, _ = require('lodash')
, request = require('request')
, assert = require('assert')
, exports = module.exports = function(opts) {
    var that = this
    _.bindAll(this)

    debug('options:\n%s', util.inspect(opts))

    this.opts = opts
    this.root = opts.firebaseRoot
    this.conn = new Client(opts.postgresUrl)
    this.bccCache = {}

    analytics.init({ secret: opts.segmentSecret })

    debug('connecting to postgres...')

    that.conn.connect(function(err) {
        if (err) return that.emit('error', err)
        debug('connected to postgres')
        that.startLoop()
    })
}

request.debug = require('debug')('request').enabled

util.inherits(exports, EventEmitter)

exports.prototype.startLoop = function() {
    var that = this
    async.forever(function(cb) {
        that.tick(function(err) {
            if (err) return that.emit('error', err)
            setTimeout(cb, 60e3)
        })
    })
}

exports.prototype.tick = function(cb) {
    var that = this
    , headRef = this.root.child('last_transaction_id')

    // Find current position (last transaction id)
    headRef.once('value', function(snapshot) {
        debug('last transaction id: %j', snapshot.val() || 'none')
        that.fetchTransactionsAfter(snapshot.val() || 0, function(err, txs) {
            if (err) return cb(err)
            debug('found %s new transactions', txs.length)
            if (!txs.length) return cb()
            async.eachSeries(txs, function(tx, cb) {
                that.processTransaction(tx, function(err) {
                    if (err) return cb(err)
                    headRef.set(tx.transaction_id)
                    cb()
                })
            }, cb)
        })
    })
}

function todayISODate() {
    return new Date().toISOString().substr(0, 10)
}

exports.prototype.processTransaction = function(tx, cb) {
    var date = new Date(tx.created_at).toISOString().substr(0, 10)
    , that = this

    this.convertToUsd(date, tx.currency_id, tx.amount, function(err, amount) {
        if (err) return cb(err)

        assert(!!amount)
        assert(tx.user_id)

        debug('conversion complete. %s %s -> %s USD', tx.amount, tx.currency_id, amount)

        var trackData = {
            userId: tx.user_id.toString(),
            event: 'Paid trading fee',
            properties: {
                revenue: +amount
            }
        }
        , createdAt = new Date(tx.created_at)

        if (new Date() - createdAt > 60 * 60 * 1000) {
            trackData.timestamp = createdAt
        }

        debug('tracking:\n%s', util.inspect(trackData))

        analytics.track(trackData)
        .on('error', function(err) {
            that.emit('error', err)
        })

        cb()
    })
}

exports.prototype.fetchTransactionsAfter = function(id, cb) {
    debug('fetching transactions after #%s', id)
    this.conn.query({
        text: [
            'SELECT amount_decimal amount, debit_user_id user_id, currency_id, created_at, transaction_id',
            'FROM transaction_view',
            'WHERE type = \'MatchFee\' AND transaction_id > $1',
            'ORDER BY transaction_id',
            'LIMIT 100'
        ].join('\n'),
        values: [id]
    }, function(err, dr) {
        cb(err, err ? null : dr.rows)
    })
}

exports.prototype.convertToUsd = function(date, currency, amount, cb) {
    var that = this

    if (currency == 'USD') {
        return cb(null, amount)
    }

    debug('converting %s %s to USD (%s)', amount, currency, date)

    if (currency == 'EUR') {
        return that.getOxrRate(date, currency, function(err, rate) {
            if (err) return cb(err)
            that.convertToUsd(date, 'USD', amount / rate, cb)
        })
    }

    if (currency == 'NOK') {
        return that.getOxrRate(date, 'NOK', function(err, rate) {
            if (err) return cb(err)
            cb(null, amount / rate)
        })
    }

    if (currency == 'BTC') {
        return that.getBccRate('bitstampUSD', date, function(err, rate) {
            if (err) return cb(err)
            that.convertToUsd(date, 'USD', rate * amount, cb)
        })
    }

    if (currency == 'LTC') {
        return that.getBccRate('justLTC', date, function(err, rate) {
            if (err) return cb(err)
            that.convertToUsd(date, 'BTC', amount / rate, cb)
        })
    }

    if (currency == 'XRP') {
        return that.getBccRate('justXRP', date, function(err, rate) {
            if (err) return cb(err)
            that.convertToUsd(date, 'BTC', amount / rate, cb)
        })
    }

    // cb(new Error(util.format('Cannot convert from %s at %s', currency, date)))

    debug('%s not implemented', currency)
    cb(null, 0)
}


exports.prototype.getOxrRate = function(date, currency, cb) {
    this.getOxrHistorical(date, function(err, data) {
        if (err) return cb(err)
        cb(null, data.rates[currency])
    })
}

exports.prototype.getOxrHistorical = function(date, cb) {
    var that = this
    , ref = this.root.child('oxr/' + date)

    // Lookup in cache
    ref.once('value', function(snapshot) {
        if (snapshot.val()) return cb(null, snapshot.val())
        debug('cache miss for oxr on %s', date)

        request({
            url: util.format('http://openexchangerates.org/api/historical/%s.json?app_id=%s', date, that.opts.oxrAppId),
            json: true
        }, function(err, res, data) {
            if (err) return cb(err)
            if (res.statusCode != 200) return cb(new Error('Status ' + res.statusCode))
            debug('rates received: %j', data)
            data.disclaimer = null
            data.license = null

            ref.set(data, function(err) {
                if (err) return cb(err)
                debug('rates stored')
                cb(null, data)
            })
        })
    })
}

exports.prototype.getBccRate = function(ticker, date, cb) {
    var that = this

    function tryGetRate(cb) {
        that.getBccHistory(ticker, function(err, data) {
            if (err) return cb(err)
            data = data.reduce(function(p, c) {
                p[c[0].toString()] = c
                return p
            }, {})

            var unix = Math.floor(new Date(date) / 864e5) * 864e2
            , item = data[unix.toString()]

            if (!item) {
                return cb(new Error(util.format('Cannot find key %s (%s) in keys', unix, date)))
            }

            cb(null, item[7])
        })
    }

    var tryN = 0

    async.forever(function(next) {
        tryGetRate(function(err, res) {
            if (!err) return cb(null, res)
            var delaySec = Math.pow(1.5, ++tryN)
            debug('retrying bitcoincharts in %s sec', delaySec)
            setTimeout(next, delaySec * 1e3)
        })
    }, cb)
}

exports.prototype.getBccHistory = function(ticker, cb) {
    var that = this

    if (this.bccCache[ticker] && this.bccCachedAt == todayISODate()) {
        return cb(null, this.bccCache[ticker])
    }

    var reqOpts = {
        url: 'http://bitcoincharts.com/charts/chart.json?m=' + ticker,
        json: true,
        headers: {
            'Referer': 'http://bitcoincharts.com/charts/bitstampUSD',
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.57 Safari/537.36',
            'Cookie': '__utma=55782072.1786445926.1362990654.1385323843.1385370659.159; __utmb=55782072.5.10.1385370659; __utmc=55782072; __utmz=55782072.1384425400.151.5.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided)'
        }
    }

    request(reqOpts, function(err, res, data) {
        if (err) return cb(err)
        if (res.statusCode != 200) {
            console.error('Request %s failed. Status %s', util.inspect(reqOpts), res.statusCode)
            return cb(new Error('Status ' + res.statusCode))
        }
        that.bccCache[ticker] = data
        that.bccCachedAt = todayISODate()
        cb(null, data)
    })
}
