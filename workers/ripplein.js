var Drop = require('drop')
, num = require('num')
, assert = require('assert')
, EventEmitter = require('events').EventEmitter
, util = require('util')
, async = require('async')
, _ = require('lodash')
, debug = require('debug')('snow:ripplein')

var RippleIn = module.exports = function(db, uri, account, secret) {
    var that = this

    assert(db)
    assert(uri)
    assert(account)
    assert(secret)

    _.bindAll(this)

    this.uri = uri
    this.client = db
    this.account = account
    this.secret = secret

    this.cacheCurrencies(function(err) {
        if (err) return that.emit(err)
        that.connect()
    })
}

util.inherits(RippleIn, EventEmitter)

RippleIn.prototype.connect = function() {
    var that = this
    debug('connecting to %s', this.uri)

    this.drop = new Drop(this.uri)
    this.drop.opts.secrets[this.account] = this.secret
    this.drop.on('close', this.onClose)
    this.drop.on('error', function(err) {
        that.emit('error', err)
    })

    debug('subscribing...')

    this.subscribeAccounts(function(err) {
        if (err) return that.emit(err)
        debug('catching up...')
        that.catchup()
    })
}

RippleIn.prototype.onClose = function() {
    debug('disconnected')
    this.emit('error', new Error('Disconnected from Ripple'))
}

RippleIn.prototype.getCurrentLedgerIndex = function(cb) {
    this.drop.ledger(function(err, ledger) {
        if (err) return cb(err)

        debug('last validated ledger retrieved (%s)', ledger.index)
        cb(null, ledger.index)
    })
}

RippleIn.prototype.catchup = function(cb) {
    var that = this

    async.waterfall([
        this.getCurrentLedgerIndex,

        function(index, next) {
            var query = 'SELECT address, ledger_index FROM ripple_account'

            that.client.query(query, function(err, dr) {
                if (err) return next(err)

                async.each(dr.rows, function(row, next) {
                    if (row.ledger_index + 1 == index) {
                        debug('no need to catch up %s', row.address)
                        return next(next)
                    }

                    that.catchupAccount(row.address, row.ledger_index + 1, index, next)
                }, next)
            })
        }
    ], cb)
}

RippleIn.prototype.setAccountLedgerIndex = function(account, index, cb) {
    this.client.query({
        text: [
            'UPDATE ripple_account',
            'SET ledger_index = $1',
            'WHERE address = $2 AND',
            '(ledger_index IS NULL OR ledger_index < $1)'
        ].join('\n'),
        values: [index, account]
    }, cb)
}

RippleIn.prototype.catchupAccount = function(account, fromIndex, toIndex, cb) {
    var that = this
    console.log('fetching transactions for %s from %d to %d', account, fromIndex, toIndex)

    this.drop.transactions(account, fromIndex, toIndex, function(err, trans) {
        if (err) return cb(err)

        console.log('found %d transactions for %s between %d and %d',
            trans.length, account, fromIndex, toIndex)

        async.each(trans, function(tran, next) {
            that.processTransaction(tran, next)
        }, function(err) {
            if (err) return cb(err)
            debug('finished catching up %s', account)
            that.setAccountLedgerIndex(account, toIndex, cb)
        })
    })
}

RippleIn.prototype.cacheCurrencies = function(cb) {
    var that = this
    , query = 'SELECT currency_id, scale FROM "currency"'
    this.client.query(query, function(err, dr) {
        if (err) return cb(err)
        var currencies = dr.rows
        that.currencies = currencies.reduce(function(p, c) {
            p[c.currency_id] = { scale: c.scale }
            return p
        }, {})
        cb()
    })
}

// FUNCTION ripple_credit(h varchar(64), s currency_id, a int, amnt bigint)
RippleIn.prototype.rippleCredit = function(hash, currencyId, userId, amount, cb) {
    console.log('ripple crediting account %s %s %s (tx %s)', userId,
        amount, currencyId, hash)

    this.client.query({
        text: 'SELECT ripple_credit($1, $2, $3, $4) tid',
        values: [hash, currencyId, userId, amount]
    }, function(err, dr) {
        if (err) {
            // Already criedted
            if (err.message.match(/ripple_credited_hash_key/)) {
                return cb()
            }

            // No such user (from destination tag)
            if (err.message == 'credit failed, account <NULL> not found') {
                err = new Error('User does not exist')
                err.name = 'UserNotFound'
                return cb(err)
            }

            return cb(err)
        }

        cb(null, dr.rows[0].tid)
    })
}

RippleIn.prototype.stringToUnits = function(amount, currencyId) {
    var currency = this.currencies[currencyId]
    if (!currency) throw new Error('currency not found')
    var n = +num(amount).mul(Math.pow(10, currency.scale))
    if (n % 1 !== 0) throw new Error('precision too high on ' + n)
    return n
}

// use a single address, but support multiple
RippleIn.prototype.subscribeAccounts = function(cb) {
    var that = this
    , query = 'SELECT address FROM ripple_account'

    this.client.query(query, function(err, dr) {
        if (err) return cb(err)
        var accounts = _.pluck(dr.rows, 'address')
        async.each(accounts, that.subscribeAccount, cb)
    })
}

RippleIn.prototype.subscribeAccount = function(account, cb) {
    debug('subscribing to %s', account)

    this.drop.subscribe(account, this.onAccountMessage.bind(this, this.account),
        function(err)
    {
        if (err) return cb(err)
        debug('subscribed to %s', account)
        cb()
    })
}

RippleIn.prototype.returnToSender = function(tran, cb) {
    var from = tran.from
    if (tran.st) from += ':' + tran.st
    var amount = _.pick(tran, 'amount' ,'issuer', 'currency')
    this.drop.payment(this.account, tran.from, amount, cb)
}

RippleIn.prototype.processTransaction = function(tran, cb) {
    var that = this

    assert(tran)
    assert(cb)

    if (tran.type != 'payment') return cb()
    if (!tran.dt) return cb()

    var units = this.stringToUnits(tran.amount, tran.currency)

    this.rippleCredit(
        tran.hash,
        tran.currency,
        tran.dt,
        units,
        function(err, tid) {
            if (err) {
                if (err.name == 'UserNotFound') {
                    debug('Returning ' + tran.hash + ' to sender')

                    return that.returnToSender(tran, function(err) {
                        if (err) {
                            err = new Error(util.format(
                                'Failed to return %s to sender: %s',
                                tran.hash, err.message))
                            that.emit('error', err)
                        }

                        that.emit('log', util.format('Transaction %s returned to sender',
                            tran.hash))

                        cb()
                    })
                }

                return cb(err)
            }

            cb(null, tid)
        }
    )
}

RippleIn.prototype.onAccountMessage = function(account, tran) {
    var that = this
    assert(tran)
    assert(tran.type)

    if (tran.type !== 'payment') return debug('Ignoring %s', tran.type)

    if (tran.to !== account) {
        assert.equal(tran.from, account)
        return
    }

    this.processTransaction(tran, function(err) {
        if (err) that.emit('error', err)
    })
}
