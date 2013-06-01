var Drop = require('drop')
, num = require('num')
, debug = require('debug')('snow:rippleout')
, assert = require('assert')
, _ = require('lodash')
, raven = require('./raven')
, util = require('util')
, prefix = 'snow:rippleout'
, out = require('./out')
, async = require('async')

var RippleOut = module.exports = function(db, account, secret, uri) {
    var that = this
    this.client = db
    this.account = account

    debug('account %s', account)

    var dropConfig = { secrets: {} }
    dropConfig.secrets[account] = secret

    if (uri) {
        dropConfig.uri = uri
    }

    this.drop = new Drop(dropConfig)

    this.cacheCurrencies(function(err) {
        if (err) {
            console.error('failed to cache currencies', err)
            throw err
        }

        that.loop()
    })
}

RippleOut.prototype.loop = function() {
    var that = this

    debug('starting loop')

    async.forever(function(cb) {
        that.work(function(err) {
            if (err) return cb(err)
            setTimeout(cb, 10e3)
        })
    }, function(err) {
        console.error('%s processing has failed. this should never happen.', prefix)
        console.error('%s', prefix, err)
        console.error('%s', prefix, err.stack)
    })
}

RippleOut.prototype.work = function(cb) {
    var that = this

    debug('looking for work...')

    out.popBatch(this.client, 'ripple', function(err, requests) {
        if (err) return cb(err)
        if (!requests) return cb()
        if (requests.length > 1) throw new Error('no batching for ripple')
        var request = requests[0]
        that.executeRequest(request, cb)
    })
}

// verify line: true/false
RippleOut.prototype.verifyLine = function(request, cb) {
    var that = this

    if (request.currency_id == 'XRP') {
        debug('will not validate line for XRP')
        return cb(null, true)
    }

    debug('checking lines for %j', request)

    that.drop.accountLines(request.address)
    .then(function(lines) {
        var line = _.where(lines, {
            account: that.account,
            currency: request.currency_id
        })[0]

        var diff = num(line ? num(line.limit).sub(line.balance) : 0).sub(num(request.amount, request.scale))

        debug('line diff %s', diff)

        if (!line || diff.lt(0)) {
            if (!line) debug('user has no line to %s', that.account)
            debug('user is missing %s in his %s line to %s', diff, request.currency_id, that.account)
            cb(null, 'not enough trust')
        }

        cb(null, true)
    }, function(err) {
        console.error('%s failed to verify line', prefix, err, err.name, err.code)
        if (err.name == 'actNotFound') return cb(null, 'no such account')
        cb(null, err.name || 'unknown')
    })
    .done()
}

RippleOut.prototype.executeRequest = function(request, cb) {
    var that = this

    debug('executing request %j', request)

    async.waterfall([
        // validate line
        this.verifyLine.bind(this, request),
        function(reason, next) {
            if (reason === true) return next()
            out.cancelRequest(that.client, request, reason, cb)
        },
        this.send.bind(this, request)
    ], cb)
}

RippleOut.prototype.amountFromRequest = function(request) {
    return request.currency_id === 'XRP' ?
        '' + +num(request.amount, request.scale).mul(1e6) :
        {
            value: request.currency_id == 'XRP' ? request.amount : +num(request.amount, request.scale) + '',
            currency: request.currency_id,
            issuer: this.account
        }
}

RippleOut.prototype.send = function(request, cb) {
    var that = this

    var amount = this.amountFromRequest(request)
    debug('amount %j', amount)

    debug('executing transaction to %s', request.address)

    that.drop.payment(that.account, request.address, that.drop.amountToJSON(amount))
    .then(function(result) {
        debug('confirming withdraw')

        that.client.query({
            text: 'SELECT confirm_withdraw($1)',
            values: [request.request_id]
        }, function(err) {
            if (!err) {
                debug('withdraw confirmed')
                return cb()
            }
            console.error('%s failed to confirm withdraw', prefix, err)
            cb()
        })
    }, function(error) {
        var abort, reason

        console.error('%s failed to send transaction', prefix, error)

        if (error.name == 'malformedTransaction') {
            abort = true
            reason = 'malformed transaction'
        } else if (error.name == 'tecUNFUNDED_PAYMENT') {
            abort = true
            reason = 'unfunded payment'
        } else if (error.name == 'dstActMalformed') {
            abort = true
            reason = 'no such account'
        } else {
            console.error('%s unknown error name from drop %s', prefix, error.name || '<null>')
        }

        if (!abort) {
            debug('transaction has failed, but will not abort')
            cb()
        }

        console.error('%s will attempt to abort', prefix, error)
        out.cancelRequest(that.client, request, 'unknown', cb)
    }).done()
}

RippleOut.prototype.cacheCurrencies = function(cb) {
    var that = this

    debug('caching currencies')

    var query = 'SELECT currency_id, scale FROM "currency"'

    return this.client.query(query, function(err, dr) {
        if (err) return cb(err)
        var rows = dr.rows
        debug('found %s currencies', rows.length)
        that.rows = rows.reduce(function(p, c) {
            p[c.currency_id] = { scale: c.scale }
            return p
        }, {})
        cb()
    })
}
