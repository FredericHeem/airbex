var Q = require('q')
, Drop = require('drop')
, num = require('num')
, assert = require('assert')
, EventEmitter = require('events').EventEmitter
, util = require('util')

var RippleIn = module.exports = function(db, uri) {
    this.client = db
    this.drop = new Drop(uri)
    this.drop.on('close', this.onClose.bind(this))

    this.cacheSecurities()
    .then(this.subscribe.bind(this))
    .then(this.catchup.bind(this))
    .done()
}

util.inherits(RippleIn, EventEmitter)

RippleIn.prototype.onClose = function() {
    var error = new Error('drop has been disconnected from ripple. recovery is not implemented')
    this.emit('error', error)
}

RippleIn.prototype.getCurrentLedger = function() {
    return this.drop.ledger('current')
    .get('seqNum')
}

RippleIn.prototype.catchup = function() {
    var that = this
    return this.getCurrentLedger()
    .then(function(ledgerIndex) {
        return Q.ninvoke(that.client, 'query', 'SELECT address, ledger_index FROM ripple_account')
        .get('rows')
        .then(function(accounts) {
            return Q.all(accounts.map(function(a) {
                return that.catchupAccount(a.address, a.ledger_index || 0, ledgerIndex)
            }))
        })
    })
}

RippleIn.prototype.setAccountLedgerIndex = function(account, index) {
    return Q.ninvoke(this.client, 'query', {
        text: 'UPDATE ripple_account SET ledger_index = $1 WHERE address = $2 AND (ledger_index IS NULL OR ledger_index < $1)',
        values: [index, account]
    })
}

RippleIn.prototype.catchupAccount = function(account, fromIndex, toIndex) {
    var that = this
    console.log('fetching transactions for %s from %d to %d', account, fromIndex, toIndex)
    return this.drop.accountTransactions(account, fromIndex, toIndex)
    .then(function(transactions) {
        console.log('found %d transactions for %s', transactions.length, account)
        return Q.fcall(function() {
            return transactions.length ? Q.all(transactions.map(function(tran) {
                return that.processTransaction(tran.tx)
            })) : null
        })
        .then(that.setAccountLedgerIndex.bind(that, account, toIndex))
    })
}

RippleIn.prototype.cacheSecurities = function() {
    var that = this
    return Q.ninvoke(this.client, 'query', 'SELECT security_id, scale FROM "security"')
    .get('rows')
    .then(function(securities) {
        that.securities = securities.reduce(function(p, c) {
            p[c.security_id] = { scale: c.scale }
            return p
        }, {})
    })
}

// FUNCTION ripple_credit(h varchar(64), s security_id, a int, amnt bigint)
RippleIn.prototype.rippleCredit = function(hash, securityId, userId, amount) {
    console.log('ripple crediting account %s %s %s (tx %s)', userId, amount, securityId, hash)
    return Q.ninvoke(this.client, 'query', {
        text: 'SELECT ripple_credit($1, $2, $3, $4) tid',
        values: [hash, securityId, userId, amount]
    })
    .then(function(cres) {
        return cres.rows[0].tid
    }, function(error) {
        if (error.message == 'duplicate key value violates unique constraint "ripple_credited_hash_key"') {
            return
        }

        if (error.message == 'insert or update on table "account" violates foreign key constraint "account_user_id_fkey"') {
            return
        }

        throw error
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
    return Q.ninvoke(this.client, 'query', 'SELECT address FROM ripple_account')
    .get('rows')
    .then(function(accounts) {
        return Q.all(accounts.map(function(a) {
            return that.subscribeAccount(a.address)
        }))
    })
}

RippleIn.prototype.subscribeAccount = function(account) {
    var subs = {
        accounts: {}
    }
    subs.accounts[account] = this.onAccountMessage.bind(this, account)

    return this.drop.subscribe(subs)
}

RippleIn.prototype.processTransaction = function(tran) {
    if (tran.TransactionType != 'Payment') {
        return
    }

    assert(tran.hash)
    assert(tran.Amount)

    if (!tran.DestinationTag) {
        return
    }

    var amount = typeof tran.Amount == 'string' ? {
        currency: 'XRP',
        issuer: null,
        value: num(tran.Amount, 6).toString()
    } : tran.Amount
    , units = this.stringToUnits(amount.value, amount.currency)

    return this.rippleCredit(
        tran.hash,
        amount.currency || 'XRP',
        +tran.DestinationTag,
        units
    )
}

RippleIn.prototype.onAccountMessage = function(account, message) {
    assert(message.transaction)
    assert(message.engine_result)

    if (message.transaction.Destination !== account) {
        assert.equal(message.transaction.Account, account)
        return
    }

    this.processTransaction(message.transaction).done()
}
