var debug = require('debug')('snow:bitcoinaddress')
, Q = require('q')
, _ = require('underscore')

var BitcoinAddress = module.exports = function(bitcoinEndpoint, dbClient) {
    var Bitcoin = require('bitcoin').Client
    this.bitcoin = new Bitcoin(bitcoinEndpoint)

    this.client = dbClient
    this.loop().done()
}

BitcoinAddress.prototype.loop = function() {
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

BitcoinAddress.prototype.saveAddress = function(accountId, address) {
    var query = 'INSERT INTO btc_deposit_address (account_id, address) \
                 VALUES ($1, $2)'

    return Q.ninvoke(this.client, 'query', {
        text: query,
        values: [accountId, address]
    })
}

BitcoinAddress.prototype.processAccount = function(row) {
    debug('processing %s', row.account_id)
    return Q.ninvoke(this.bitcoin, 'getNewAddress')
    .then(this.saveAddress.bind(this, row.account_id))
}

BitcoinAddress.prototype.findAccountsNeedingAddresses = function() {
    var that = this

    var query = 'SELECT a.account_id \
                 FROM account a \
                 LEFT JOIN btc_deposit_address bda ON bda.account_id = a.account_id \
                 WHERE a.security_id = \'BTC\' AND bda.address IS NULL'

    return Q.ninvoke(this.client, 'query', query)
    .get('rows')
    .then(function(rows) {
        return rows.map(that.processAccount, that)
    })
    .all()
}
