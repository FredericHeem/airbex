var debug = require('debug')('snow:cryptoaddress')
, async = require('async')
, _ = require('lodash')
, EventEmitter = require('events').EventEmitter
, util = require('util')

var CryptoAddress = module.exports = function(ep, dbClient) {
    _.bindAll(this)
    debug("CryptoAddress for currency: ", ep.currency)
    var Bitcoin = require('bitcoin').Client
    this.bitcoin = new Bitcoin(ep)
    this.client = dbClient
    this.currency = ep.currency
    this.currencyLC = this.currency.toLowerCase();
    this.loop()
}

util.inherits(CryptoAddress, EventEmitter)

CryptoAddress.prototype.loop = function() {
    var that = this

    async.waterfall([
        this.getAccounts,
        this.processAccounts
    ], function(err) {
        if (err) that.emit('error', err)
        setTimeout(that.loop, 5e3)
    })
}

CryptoAddress.prototype.saveAddress = function(accountId, address, cb) {
    var queryText = 
         [
             "INSERT INTO crypto_deposit_address(currency_id, account_id, address)",
             'VALUES ($1, $2, $3)'
         ].join('\n');
    
    this.client.query({
        text: queryText,
        values: [this.currency, accountId, address]
    }, function(err) {
        if (err) return cb(err)
        console.log('Assigned Bitcoin address %s to account %s', address, accountId)
        cb()
    })
}

CryptoAddress.prototype.processAccounts = function(rows, cb) {
    debug('processing %d work items', rows.length)
    async.each(rows, this.processAccount, cb)
}

CryptoAddress.prototype.processAccount = function(row, cb) {
    var that = this
    debug('processing %s', row.account_id)
    this.bitcoin.getNewAddress(function(err, address) {
        if (err) return cb(err)
        that.saveAddress(row.account_id, address, cb)
    })
}

CryptoAddress.prototype.getAccounts = function(cb) {
    debug('looking for work')
    var queryText = util.format(
            [
             'SELECT a.account_id',
             'FROM account a',
             'LEFT JOIN crypto_deposit_address cda ON cda.account_id = a.account_id',
             'WHERE a.currency_id = \'%s\' AND cda.address IS NULL'
         ].join('\n'),
         this.currency);
    
    this.client.query({
        text: queryText
    }, function(err, dr) {
        cb(err, err ? null : dr.rows)
    })
}
