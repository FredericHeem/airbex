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

    this.connect()

    async.parallel([
        that.cacheCurrencies
    ], function(err) {
        if (err) that.emit(err)

        debug('subscribing...')

        that.subscribeAccounts(function(err) {
            if (err) return that.emit(err)

            that.catchup(function(err) {
                if (err) that.emit(err)
                debug('finished catching up. init complete')
            })
        })
    })
}

util.inherits(RippleIn, EventEmitter)

RippleIn.prototype.connect = function() {
    var that = this

    debug('connecting to %s', this.uri)

    this.drop = new Drop(this.uri)
    this.drop.opts.secrets[this.account] = this.secret

    this.drop.on('close', function() {
        that.emit('error', new Error('Disconnected from Ripple'))
    })

    this.drop.on('error', function(err) {
        that.emit('error', err)
    })
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
    debug('catching up...')

    async.waterfall([
        this.getCurrentLedgerIndex,

        function(index, next) {
            debug('fetching internal accounts and ledger indexes...')

            var query = 'SELECT address, ledger_index FROM ripple_account'

            that.client.query(query, function(err, dr) {
                if (err) return next(err)
                debug('found %d accounts', dr.rows.length)

                async.eachSeries(dr.rows, function(row, next) {
                    debug('row %s index %s', row.ledger_index, index)

                    if (row.ledger_index == index) {
                        console.log('No need to catch up %s', row.address)
                        return next()
                    }

                    that.catchupAccount(row.address, row.ledger_index + 1, index, next)
                }, next)
            })
        }
    ], cb)
}

RippleIn.prototype.setAccountLedgerIndex = function(account, index, cb) {
    console.log('Setting ledger index of account %s to %s', account, index)

    this.client.query({
        text: [
            'UPDATE ripple_account',
            'SET ledger_index = $1',
            'WHERE address = $2 AND',
            '(ledger_index IS NULL OR ledger_index < $1)'
        ].join('\n'),
        values: [index, account]
    }, function(err, dr) {
        if (err) {
            console.error('Failed to ledger index for %s to %s: %s',
                account, index, err.message)

            return cb(err)
        }

        if (dr.rowCount) {
            console.log('Ledger index of account %s set to %s', account, index)
        } else {
            console.log('Ledger index was not set for %s (redundant)', account)
        }

        cb()
    })
}

RippleIn.prototype.catchupAccount = function(account, fromIndex, toIndex, cb) {
    var that = this

    console.log('Catching up account %s (%d ... %d)', account, fromIndex, toIndex)

    this.drop.transactions(account, fromIndex, toIndex, function(err, trans) {
        if (err) return cb(err)

        console.log('Found %d transactions for %s',
            trans.length, account, fromIndex, toIndex)

        async.eachSeries(trans, function(tran, next) {
            that.processTransaction(tran, next)
        }, function(err) {
            if (err) return cb(err)
            debug('finished catching up %s', account)
            that.setAccountLedgerIndex(account, toIndex, cb)
        }, cb)
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
RippleIn.prototype.rippleCredit = function(hash, currencyId, tag, amount, cb) {
    console.log('Ripple crediting user with tag %s %s %s (tx %s)', tag,
        amount, currencyId, hash)

    this.client.query({
        text: 'SELECT ripple_credit($1, $2, $3, $4) tid',
        values: [hash, currencyId, tag, amount]
    }, function(err, dr) {
        if (err) {
            // Already credited
            if (err.message.match(/ripple_processed_pkey/)) {
                debug('ignoring duplicate ripple credit')
                return cb()
            }

            // No such user (from destination tag)
            if (err.message.match(/User with tag/)) {
                err = new Error('User does not exist')
                err.name = 'UserNotFound'
                return cb(err)
            }

            return cb(err)
        }

        console.log('ripple credit complete, internal transaction id %s', dr.rows[0].tid)

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

    debug('looking for accounts...')

    this.client.query(query, function(err, dr) {
        if (err) return cb(err)
        debug('found %s accounts', dr.rowCount)
        var accounts = _.pluck(dr.rows, 'address')
        async.eachSeries(accounts, that.subscribeAccount, cb)
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
    var that = this

    this.client.query({
        text: [
            'INSERT INTO ripple_processed (hash, returned)',
            'VALUES ($1, $2)'
        ].join('\n'),
        values: [tran.hash, true]
    }, function(err) {
        if (err) {
            if (err.message.match(/ripple_processed_pkey/)) {
                console.log('Already returned transaction %s to sender', tran.hash)
                return cb(null, false)
            }

            return cb(err, false)
        }

        if (tran.st) from += ':' + tran.st

        var from = tran.from
        , amount = _.pick(tran, 'amount' ,'issuer', 'currency')

        that.drop.payment(that.account, tran.from, amount, function(err) {
            if (err) return cb(err)
            cb(null, true)
        })
    })
}

RippleIn.prototype.processTransaction = function(tran, cb) {
    var that = this

    assert(tran)
    assert(tran.type)
    assert(cb)

    if (tran.from == this.account) {
        return cb()
    }

    if (tran.to != this.account) {
        debug('ignoring transaction not to us (to %s)', tran.to)
        return cb()
    }

    if (tran.type !== 'payment') {
        debug('Ignoring %s', tran.type)
        return cb()
    }

    debug('processing transaction %s...', tran.hash)
    debug(util.inspect(tran))

    if (tran.type != 'payment') {
        debug('unexpected transaction type %s. skipping', tran.type)
        return cb()
    }

    if (!tran.dt) {
        debug('ignoring legacy transaction with no dt')
        return cb()
    }

    if (tran.issuer && tran.issuer != this.account) {
        debug('ignoring transaction with issuer %s (not us)', tran.issuer)
        return cb()
    }

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

                    return that.returnToSender(tran, function(err, returned) {
                        if (err) {
                            err = new Error(util.format(
                                'Failed to return %s to sender: %s',
                                tran.hash, err.message))
                            that.emit('error', err)
                        }

                        if (returned) {
                            that.emit('log', util.format(
                                'Transaction %s returned to sender',
                                tran.hash))
                        }

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

    this.processTransaction(tran, function(err) {
        if (err) that.emit('error', err)
    })
}
