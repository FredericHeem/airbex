var Q = require('q')
, Drop = require('drop')
, num = require('num')
, assert = require('assert')
, raven = require('./raven')

// note ledger_index on the account (concurrency!)
// handle txers in the same way
var RippleIn = module.exports = function(db, uri) {
    this.client = db
    this.drop = new Drop(uri)

    this.cacheSecurities()
    .then(this.subscribe.bind(this))
    .then(this.catchup.bind(this))
    .then(function() {
        console.log('finished catching up all accounts')
    })
    .done()
}


RippleIn.prototype.getCurrentLedger = function() {
    return this.drop.ledger('current')
    .get('seqNum')
}

RippleIn.prototype.catchup = function() {
    var that = this
    return this.getCurrentLedger()
    .then(function(ledgerIndex) {
        console.log('current ledger is %s', ledgerIndex)

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
RippleIn.prototype.rippleCredit = function(hash, securityId, accountId, amount) {
    console.log('ripple crediting account %s %s %s (tx %s)', accountId, amount, securityId, hash)
    return Q.ninvoke(this.client, 'query', {
        text: 'SELECT ripple_credit($1, $2, $3, $4) tid',
        values: [hash, securityId, accountId, amount]
    })
    .then(function(cres) {
        return cres.rows[0].tid
    }, function(error) {
        if (error.message == 'duplicate key value violates unique constraint "ripple_credited_hash_key"') {
            console.error('ignoring duplicate credit of ripple tx %s', hash)
            console.error(error)
            return
        }

        if (error.message.match(/^account security_id/)) {
            console.error('ripple crediting %s fails because of a security mismatch', hash)
            console.error(error)
            return
        }

        if (error.message.match(/^account not found/)) {
            console.error('ripple crediting %s fails because the account is unknown', hash)
            console.error(error)
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
        console.warn('ignoring transaction which is missing destination tag')
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
            console.log('skipping transaction %s', tran.hash)
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
        return
    }

    this.processTransaction(message.transaction).done()
}
