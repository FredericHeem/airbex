var RippleAccountMonitor = require('./ripple.monitor')
, _ = require('lodash')
, EventEmitter = require('events').EventEmitter
, util = require('util')
, PgClient = require('pg').Client
, num = require('num')
, assert = require('assert')
, debug = require('debug')('snow:ripplein')
, ripplelib = require('ripple-lib')
, RippleClient = require('./ripple.client')

module.exports = exports = function(account, opts) {
    _.bindAll(this)
    this.opts = opts
    this.account = account

    // Connect to PostgreSQL
    this.postgres = new PgClient(opts.postgresUri)
    this.postgres.connect()

    this.cacheCurrencies(function(err) {
        if (err) return this.emit('error', err)

        this.ripple = new RippleClient({
            secrets: this.opts.secrets
        })

        this.getInternalLedgerIndex(function(err, index) {
            if (err) return this.emit('error', err)

            // Set up transaction monitor
            this.monitor = new RippleAccountMonitor({
                ripple: this.ripple,
                ledgerIndex: index
            })
            this.monitor.account(account, this.rippleTransaction)
            this.monitor.on('ledgerclosed', this.rippleLedgerClosed)
        }.bind(this))
    }.bind(this))
}

util.inherits(exports, EventEmitter)

exports.prototype.getInternalLedgerIndex = function(cb) {
    var query = 'SELECT ledger_index FROM ripple_account'
    this.postgres.query(query, function(err, dr) {
        cb(err, err ? null : dr.rows[0].ledger_index)
    })
}

exports.prototype.rippleLedgerClosed = function(index) {
    // There is no need to save every ledger index to the database
    if (index % 25 > 0) return

    debug('saving ledger internal index as %s', index)

    this.postgres.query({
        text: [
            'UPDATE ripple_account',
            'SET ledger_index = $1'
        ].join('\n'),
        values: [index]
    }, function(err) {
        if (!err) return debug('saved ledger index as %s', index)
        console.error('failed to save internal ledger index: %s\n%s', err.message, err.stack)
    })
}

exports.prototype.cacheCurrencies = function(cb) {
    var query = 'SELECT currency_id, scale FROM "currency"'
    this.postgres.query(query, function(err, dr) {
        if (err) return cb(err)
        var currencies = dr.rows
        this.currencies = currencies.reduce(function(p, c) {
            p[c.currency_id] = { scale: c.scale }
            return p
        }, {})
        cb()
    }.bind(this))
}

exports.prototype.rippleCredit = function(hash, currencyId, tag, amount, cb) {
    console.log('Ripple crediting user with tag %s %s %s (tx %s)', tag,
        num(amount, this.currencies[currencyId].scale).toString(), currencyId, hash)

    this.postgres.query({
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

        console.log('Credited %s, internal transaction id %s', hash, dr.rows[0].tid)

        cb(null, dr.rows[0].tid)
    })
}

exports.prototype.stringToUnits = function(amount, currencyId) {
    var currency = this.currencies[currencyId]
    if (!currency) throw new Error('currency ' + currencyId + ' not found')
    var n = num(amount).mul(Math.pow(10, currency.scale))
    if (+n % 1 !== 0) throw new Error('precision too high on ' + n.toString())
    return n.toString().replace(/\.0+$/, '')
}

// Marks the transaction as processed. The returned parameter stores
// whether the transaction was to be returned to sender.
exports.prototype.markProcessed = function(hash, returned, cb) {
    debug('marking %s as processed %sreturned', hash, returned ? '' : 'NOT ')

    this.postgres.query({
        text: [
            'INSERT INTO ripple_processed (hash, returned)',
            'VALUES ($1, $2)'
        ].join('\n'),
        values: [hash, !!returned]
    }, function(err) {
        if (err) {
            if (err.message.match(/ripple_processed_pkey/)) {
                debug('transaction %s has already been processed', hash)
                return cb(null, false)
            }

            return cb(err)
        }

        cb(null, true)
    })
}

// Return the specified transaction to its sender
exports.prototype.returnToSender = function(tran, cb) {
    debug('returning %s to sender %s', tran.hash, tran.Account)

    this.markProcessed(tran.hash, true, function(err, res) {
        if (err) {
            console.error('failed to return %s to sender', tran.hash)
            console.error(err.message)
            return cb && cb(err)
        }

        if (!res) {
            debug('will not return duplicate transaction %s', tran.hash)
            return cb && cb(null, false)
        }

        var to = tran.Account
        if (tran.SourceTag) to += ':' + tran.SourceTag

        var tx = {
            Amount: tran.Amount,
            Destination: tran.Account,
            Account: tran.Destination,
            TransactionType: 'Payment'
        }

        if (tran.SourceTag) {
            tx.DestinationTag = tran.SourceTag
        }

        if (tran.DestinationTag) {
            tx.SourceTag = tran.DestinationTag
        }

        this.ripple.submit(tx, function(err) {
            if (!err) return cb && cb(null, true)
            console.error('failed to return %s to sender: %s', tran.hash, err.message)
            cb(err)
        })
    }.bind(this))
}

exports.prototype.tryReturnToSender = function(tran, cb) {
    this.returnToSender(tran, function(err, returned) {
        if (err) {
            err = new Error(util.format('Failed to return %s to sender: %s\n%s', tran.hash, err.message, err.stack))
            this.emit(err)
        } else if (returned) {
            console.log('Returned %s to sender', tran.hash)
        } else {
            debug('Did not return %s to sender (duplicate)', tran.hash)
        }

        cb && cb()
    }.bind(this))
}

// Process a transation. The format differs slightly between transaction-inbound
// and the result from account_tx (transaction field or tx field)
exports.prototype.rippleTransaction = function(tran, cb) {
    assert(tran.hash)

    assert(tran.TransactionType)
    if (tran.TransactionType != 'Payment') {
        debug('ignoring transaction of type %s', tran.TransactionType)
        return cb && cb()
    }

    assert(tran.Destination)
    if (tran.Destination != this.account) {
        debug('ignoring transaction not to us (%s)', tran.Destination)
        return cb && cb()
    }

    if (tran.DestinationTag === undefined) {
        if (process.env.NODE_ENV == 'production') {
            throw new Error('Cannot receive without destination tag in production')
        }

        debug('ignoring transaction with destination tag when not in production')

        return cb && cb()
    }

    if (tran.DestinationTag == 1) {
        debug('ignoring transaction with tag %s', tran.DestinationTag || '(none)')
        return cb && cb()
    }

    assert(tran.Amount)
    if (tran.Amount.issuer && tran.Amount.issuer != this.account) {
        debug('returning transaction with issuer %s', tran.Amount.issuer)
        return exports.returnToSender(tran, cb)
    }

    //debug('transaction:\n%s', util.inspect(tran))

    var rippleAmount = ripplelib.Amount.from_json(tran.Amount)
    , currency = rippleAmount._currency.to_human()
    , units

    if (currency == 'XRP') {
        assert(typeof tran.Amount == 'string')
        assert(!~tran.Amount.indexOf('.'))
    }

    try {
        var text = rippleAmount.to_text()
        if (currency == 'XRP') {
            text = num(text, 6).toString()
        }
        units = this.stringToUnits(text, currency)
    } catch (e) {
        if (e.message.match(/^precision too high/)) {
            debug('precision of %s (%s) is too high', tran.hash, rippleAmount.to_text())
            return this.tryReturnToSender(tran, cb)
        }

        throw e
    }

    debug('ripple amount %s %s. our units: %s', rippleAmount._currency.to_human(), rippleAmount.to_text(), units)

    this.rippleCredit(
        tran.hash,
        currency,
        tran.DestinationTag,
        units,
        function(err, tid) {
            if (err) {
                if (err.name == 'UserNotFound') {
                    console.log('User not found (unknown DT %s). Will return transaction', tran.DestinationTag)
                    return this.tryReturnToSender(tran, cb)
                }

                this.emit(err)
                return cb && cb(err)
            }

            cb && cb(null, tid)
        }.bind(this)
    )
}
