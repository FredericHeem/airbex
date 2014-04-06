var _ = require('lodash')
, EventEmitter = require('events').EventEmitter
, util = require('util')
, debug = require('debug')('snow:ripple:acctmon')
, async = require('async')
, assert = require('assert')

module.exports = exports = function(opts) {
    _.bindAll(this)
    this.opts = opts
    this.ripple = opts.ripple
    this.ripple.on('open', this.rippleOpen)
    this.ripple.on('close', this.rippleClose)
    this.ripple.on('transaction', this.rippleTransaction)
    this.ripple.on('ledgerclosed', this.rippleLedgerClosed)
    this.internalLedger = opts.ledgerIndex || 3696574
    this.accounts = {}
}

util.inherits(exports, EventEmitter)

exports.prototype.rippleOpen = function() {
    this.live = false
    this.processedHashes = []

    async.series([
        // Attach existing subscriptions
        function(cb) {
            debug('attaching existing subscriptions...')
            async.each(Object.keys(this.accounts), function(account, cb) {
                this.subscribeToAccount(account, cb)
            }.bind(this), cb)
        }.bind(this),

        // Catch up from internal ledger to the closed one
        function(cb) {
            debug('catching up from ledger #%s...', this.internalLedger + 1)
            async.each(Object.keys(this.accounts), function(account, cb) {
                this.catchupAccount(account, this.internalLedger + 1, cb)
            }.bind(this), cb)
        }.bind(this),

        // Subscribe to ledger closes
        function(cb) {
            debug('subscribing to ledger close...')
            this.subscribeToLedgerClose(function(err) {
                if (err) return cb(err)
                debug('subscribed to ledger close')
                cb()
            })
        }.bind(this)
    ], function(err) {
        if (err) {
            var wrappedErr = new Error('Initialization failed: ' + err.message)
            wrappedErr.inner = err
            return this.emit('error', wrappedErr)
        }
        this.live = true
        this.processedHashes = null
        debug('caught up and live')
    }.bind(this))
}

exports.prototype.rippleLedgerClosed = function(message) {
    assert.equal(this.live, true)

    debug('ledger %s closed', message.ledger_index)

    this.internalLedger = message.ledger_index
    this.emit('ledgerclosed', message.ledger_index)
}

exports.prototype.catchupAccount = function(account, from, cb) {
    this.ripple.request('account_tx', {
        account: account,
        ledger_index_min: from,
        forward: true
    }, function(err, txs) {
        if (err) return cb(err)
        assert(txs.transactions)
        txs.transactions.forEach(function(tx) {
            assert.equal(tx.meta.TransactionResult, 'tesSUCCESS')
            this.processTransaction(tx.tx, cb)
        }.bind(this))
        cb()
    }.bind(this))
}

exports.prototype.subscribeToLedgerClose = function(cb) {
    this.ripple.request('subscribe', {
        streams: ['ledger']
    }, cb)
}

exports.prototype.rippleClose = function() {
}

exports.prototype.subscribeToAccount = function(account, cb) {
    this.ripple.request('subscribe', {
        accounts: [account]
    }, cb)
}

exports.prototype.account = function(account, cb) {
    debug('adding subscription to account %s', account)
    var item = this.accounts[account]
    if (!item) {
        item = (this.accounts[account] = [])
        if (this.ripple.connected) {
            this.subscribeToAccount(account)
        }
    }
    item.push(cb)
}

exports.prototype.rippleTransaction = function(tx) {
    this.processTransaction(tx)
}

exports.prototype.processTransaction = function(tx) {
    if (tx.TransactionType != 'Payment') {
        return debug('Ignoring tx type %s', tx.TransactionType)
    }

    if (!this.live) {
        // Has the transaction already been processed by catch-up?
        if (~this.processedHashes.indexOf(tx.hash)) return

        this.processedHashes.push(tx.hash)
    }

    _.each(this.accounts, function(subs, account) {
        if (account != tx.Destination) return
        subs.forEach(function(sub) {
            sub(tx)
        })
    })
}
