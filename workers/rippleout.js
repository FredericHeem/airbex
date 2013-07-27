var Drop = require('drop')
, num = require('num')
, debug = require('debug')('snow:rippleout')
, assert = require('assert')
, _ = require('lodash')
, prefix = 'snow:rippleout'
, out = require('./lib/out')
, async = require('async')
, format = require('util').format
, util = require('util')
, EventEmitter = require('events').EventEmitter

var RippleOut = module.exports = function(db, account, secret, uri) {
    _.bindAll(this)

    var that = this
    this.client = db
    this.account = account

    debug('account %s', account)

    this.dropConfig = {
        secrets: {},
        uri: uri
    }
    this.dropConfig.secrets[account] = secret

    async.parallel([
        this.connect,
        this.cacheCurrencies
    ], function(err) {
        if (err) return that.emit(err)
        that.loop()
    })
}

util.inherits(RippleOut, EventEmitter)

RippleOut.prototype.connect = function(cb) {
    var that = this

    debug('connecting to Ripple (%s)', this.dropConfig.uri)

    this.drop = new Drop(this.dropConfig, cb)

    this.drop.on('close', function() {
        that.emit('error', new Error('Disconnected from Ripple'))
    })

    this.drop.on('error', function(err) {
        that.emit('error', err)
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
    })
}

RippleOut.prototype.work = function(cb) {
    var that = this

    debug('looking for work...')

    out.popBatch(this.client, 'ripple', function(err, requests) {
        if (err) {
            err = new Error(format('Failed to pop batch: %s', err.message))
            that.emit('error', err)
            return cb()
        }

        if (!requests) return cb()
        assert(requests.length == 1)
        var request = requests[0]
        that.executeRequest(request, cb)
    })
}

// verify line: true/false
RippleOut.prototype.verifyLine = function(request, cb) {
    var that = this

    if (request.currency_id == 'XRP') {
        debug('will not verify line for XRP')
        return cb(null, true)
    }

    debug('checking lines for %j', request)

    that.drop.lines(request.address, function(err, lines) {
        if (err) {
            if (err.name == 'actNotFound') {
                return cb(err)
            }

            return cb(new Error(format('Failed to verify line to %s. %s: %s',
                request.address, err.name, err.message)))
        }

        var line = _.find(lines, {
            account: that.account,
            currency: request.currency_id
        })

        var diff = num(line ? num(line.limit).sub(line.balance) : 0)
        .sub(num(request.amount, request.scale))

        debug('line diff %s', diff)

        if (!line || diff.lt(0)) {
            if (!line) debug('user has no line to %s', that.account)
            debug('user is missing %s in his %s line to %s', diff, request.currency_id,
                that.account)
            return cb(null, false)
        }

        cb(null, true)
    })
}

RippleOut.prototype.executeRequest = function(request, cb) {
    var that = this

    debug('executing request %j', request)

    async.waterfall([
        // validate line
        function(next) {
            that.verifyLine(request, function(err, valid) {
                if (err) {
                    if (err.name == 'actNotFound') {
                        out.cancelRequest(that.client, request, 'Account not found', cb)
                        return
                    }

                    return next(err)
                }

                next(null, valid)
            })
        },

        function(valid, next) {
            debug('line verification completed, %s', valid)
            if (valid === true) return next()
            out.cancelRequest(that.client, request, 'Trust issues', cb)
        },
        this.send.bind(this, request)
    ], cb)
}

RippleOut.prototype.send = function(request, cb) {
    var that = this

    var amount = {
        currency: request.currency_id,
        amount: num(request.amount, request.scale).toString()
    }

    if (amount.currency != 'XRP') {
        amount.issuer = this.account
    }

    debug('amount %j', amount)

    debug('executing transaction to %s...', request.address)

    that.drop.payment(that.account, request.address, amount,
        function(err)
    {
        debug('execution completed')

        if (err) {
            var abort, reason, report

            if (err.name == 'malformedTransaction') {
                abort = true
                reason = 'malformed transaction'
                report = true
            } else if (err.name == 'tecUNFUNDED_PAYMENT') {
                abort = true
                reason = 'unfunded payment'
            } else if (err.name == 'dstActMalformed') {
                abort = true
                reason = 'Account not found'
            } else if (err.name == 'tooBusy') {
                abort = true
                reason = 'Ripple server too busy. Try again'
            } else {
                report = true
            }

            if (report) {
                err = new Error(format('Failed to send transaction #%s: %s, %s',
                    request.request_id, err.name || 'Unnamed', err.message))
                that.emit('error', err)
            } else {
                debug('will not report error %s: %s', err.name || '<null>', err.message)
            }

            if (!abort) {
                console.error('transaction is in an uncertain state')
                return cb()
            }

            console.error('%s will attempt to abort', prefix, err)

            return out.cancelRequest(that.client, request, 'unknown', function(err) {
                if (err) {
                    err = new Error(format('Failed to cancel withdraw reqeust: %s',
                    err.message))
                    that.emit('error', err)
                }

                cb()
            })
        }

        debug('confirming withdraw')

        out.markRequestCompleted(that.client, request, function(err) {
            if (err) {
                err = new Error(format(
                    'Failed to mark withdraw request %s as completed: %s',
                    request.request_id, err.message))
                that.emit('error', err)
            }
            cb()
        })
    })
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
