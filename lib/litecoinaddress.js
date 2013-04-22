var debug = require('debug')('snow:litecoinaddress')
, Q = require('q')
, _ = require('underscore')

var LitecoinAddress = module.exports = function(ep, dbClient) {
    var Client = require('bitcoin').Client
    this.litecoin = new Client(ep)

    this.client = dbClient
    this.loop().done()
}

LitecoinAddress.prototype.loop = function() {
    var that = this
    return this.findAccountsNeedingAddresses()
    .then(function(result) {
        if (result.length) return that.loop()
        debug('nothing to do, next loop in 10 sec')
        return Q.delay(10e3)
        .then(function() {
            return that.loop()
        })
    })
}

LitecoinAddress.prototype.saveAddress = function(accountId, address) {
    var query = 'INSERT INTO ltc_deposit_address (account_id, address) \
                 VALUES ($1, $2)'

    return Q.ninvoke(this.client, 'query', {
        text: query,
        values: [accountId, address]
    })
}

LitecoinAddress.prototype.processAccount = function(row) {
    debug('processing %s', row.account_id)
    return Q.ninvoke(this.litecoin, 'getNewAddress')
    .then(this.saveAddress.bind(this, row.account_id))
}

LitecoinAddress.prototype.findAccountsNeedingAddresses = function() {
    var that = this

    var query = 'SELECT a.account_id \
                 FROM account a \
                 LEFT JOIN ltc_deposit_address bda ON bda.account_id = a.account_id \
                 WHERE a.security_id = \'LTC\' AND bda.address IS NULL'

    return Q.ninvoke(this.client, 'query', query)
    .get('rows')
    .then(function(rows) {
        return rows.map(that.processAccount, that)
    })
    .all()
}
