var Q = require('q')
, Drop = require('drop')
, num = require('num')
, debug = require('debug')('snow:ripplein')
, assert = require('assert')

// note ledger_index on the account (concurrency!)
// handle txers in the same way
var RippleIn = module.exports = function(db) {
    var that = this
    this.client = db()
    this.drop = new Drop()

    this.cacheSecurities()
    .then(this.subscribe.bind(this))
    .then(this.catchup.bind(this))
    .done()
}

RippleIn.prototype.getCurrentLedger = function() {
    return this.drop.ledger('current')
    .get('seqNum')
}

RippleIn.prototype.catchup = function() {
    var that = this
    debug('catching up')
    debug('finding current ledger')
    return this.getCurrentLedger()
    .then(function(ledgerIndex) {
        debug('current ledger is %s', ledgerIndex)
        debug('looking up accounts')

        return Q.ninvoke(that.client, 'query', 'SELECT address, ledger_index FROM ripple_account')
        .get('rows')
        .then(function(accounts) {
            debug('found %s accounts', accounts.length)
            return Q.all(accounts.map(function(a) {
                // TODO: remove magic number
                return that.catchupAccount(a.address, a.ledger_index || 313689, ledgerIndex)
            }))
        })
    })
}

RippleIn.prototype.catchupAccount = function(account, fromIndex, toIndex) {
    debug('catching up account %s on index %s (target is %s)', account, fromIndex, toIndex)
    var that = this
    return this.drop.accountTransactions(account, fromIndex)
    .then(function(transactions) {
        debug('found %s transactions', transactions.length)
        return transactions.length ? Q.all(transactions.map(function(tran) {
            return that.processTransaction(tran.tx)
        })) : null
    })
    .fail(function(error) {
        if (error.name == 'ledgerNotFound') {
            debug('*** ignoring ledgerNotFound on account_tx for now ***')
            return
        }
        throw error
    })
    .then(function() {
        return Q.ninvoke(that.client, 'query', {
            text: 'UPDATE ripple_account SET ledger_index = $1 WHERE address = $2',
            values: [fromIndex, account]
        })
        .then(function() {
            if (fromIndex === toIndex - 1) return
            return that.catchupAccount(account, fromIndex + 1, toIndex)
        })
    })
}

RippleIn.prototype.cacheSecurities = function() {
    var that = this
    debug('caching securities')
    return Q.ninvoke(this.client, 'query', 'SELECT security_id, scale FROM "security"')
    .get('rows')
    .then(function(securities) {
        debug('found %s securities', securities.length)
        that.securities = securities.reduce(function(p, c) {
            p[c.security_id] = { scale: c.scale }
            return p
        }, {})
    })
}

// FUNCTION ripple_credit(h varchar(64), s security_id, a int, amnt bigint)
RippleIn.prototype.rippleCredit = function(hash, securityId, accountId, amount) {
    debug('ripple crediting account %s %s %s (tx %s)', accountId, amount, securityId, hash)
    return Q.ninvoke(this.client, 'query', {
        text: 'SELECT ripple_credit($1, $2, $3, $4) tid',
        values: [hash, securityId, accountId, amount]
    })
    .get('rows').get(0).get('tid')
    .fail(function(error) {
        if (error.message == 'duplicate key value violates unique constraint "ripple_credited_hash_key"') {
            var err = new Error('transaction has already been credited')
            err.code = 'EDUPLICATE_CREDIT'
            throw err
        }

        throw error
    })
    .then(function() {
        debug('credit successful')
    })
}

RippleIn.prototype.stringToUnits = function(amount, securityId) {
    var security = this.securities[securityId]
    if (!security) throw new Error('security not found')
    var n = +num(amount).mul(Math.pow(10, security.scale))
    if (n % 1 !== 0) throw new Error('precision too high on ' + n)
    return n
}

// use a single address, but support multiple
RippleIn.prototype.subscribe = function() {
    var that = this
    debug('subscribing to all accounts')
    return Q.ninvoke(this.client, 'query', 'SELECT address FROM ripple_account')
    .get('rows')
    .then(function(accounts) {
        debug('found %s accounts', accounts.length)
        return Q.all(accounts.map(function(a) {
            return that.subscribeAccount(a.address)
            .fail(function(error) {
                throw error
            })
        }))
    })
}

RippleIn.prototype.subscribeAccount = function(account) {
    debug('subscribing to account %s', account)
    var subs = {
        accounts: {}
    }
    subs.accounts[account] = this.onAccountMessage.bind(this, account)

    return this.drop.subscribe(subs)
}

RippleIn.prototype.processTransaction = function(tran) {
    debug('processing transaction with hash %s', tran.hash)

    if (tran.TransactionType != 'Payment') {
        debug('ignoring %s transaction', tran.TransactionType)
        return
    }

    assert(tran.hash)
    assert(tran.Amount)

    if (!tran.DestinationTag) {
        debug('ignoring transaction which is missing destination tag')
        return
    }

    var amount = new Drop.Amount(tran.Amount)
    , units = this.stringToUnits(amount.value, amount.currency || 'XRP')

    // TODO: can update ledger index here

    return this.rippleCredit(
        tran.hash,
        amount.currency || 'XRP',
        +tran.DestinationTag,
        units
    )
    .fail(function(err) {
        if (err.code === 'EDUPLICATE_CREDIT') {
            debug('skipping transaction that was already credited')
            return
        }
        throw err
    })
}

RippleIn.prototype.onAccountMessage = function(account, message) {
    assert(message.transaction)
    assert(message.engine_result)

    if (message.transaction.Destination !== account) {
        assert.equal(message.transaction.Account, account)
        debug('ignoring transaction from the subbed account %s', account)
        return
    }

    this.processTransaction(message.transaction)
}

new RippleIn(require('./db'))
