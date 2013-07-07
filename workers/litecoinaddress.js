var debug = require('debug')('snow:litecoinaddress')
, async = require('async')
, _ = require('lodash')
, EventEmitter = require('events').EventEmitter
, util = require('util')

var LitecoinAddress = module.exports = function(ep, dbClient) {
    _.bindAll(this)

    var Bitcoin = require('bitcoin').Client
    this.bitcoin = new Bitcoin(ep)
    this.client = dbClient

    this.loop()
}

util.inherits(LitecoinAddress, EventEmitter)

LitecoinAddress.prototype.loop = function() {
    var that = this

    async.waterfall([
        this.getAccounts,
        this.processAccounts
    ], function(err) {
        if (err) that.emit('error', err)
        setTimeout(that.loop, 5e3)
    })
}

LitecoinAddress.prototype.saveAddress = function(accountId, address, cb) {
    this.client.query({
        text: [
            'INSERT INTO ltc_deposit_address (account_id, address)',
            'VALUES ($1, $2)'
        ].join('\n'),
        values: [accountId, address]
    }, function(err) {
        if (err) return cb(err)
        console.log('Assigned Litecoin address %s to account %s', address, accountId)
        cb()
    })
}

LitecoinAddress.prototype.processAccounts = function(rows, cb) {
    debug('processing %d work items', rows.length)
    async.each(rows, this.processAccount, cb)
}

LitecoinAddress.prototype.processAccount = function(row, cb) {
    var that = this
    debug('processing %s', row.account_id)
    this.bitcoin.getNewAddress(function(err, address) {
        if (err) return cb(err)
        that.saveAddress(row.account_id, address, cb)
    })
}

LitecoinAddress.prototype.getAccounts = function(cb) {
    debug('looking for work')

    this.client.query({
        text: [
            'SELECT a.account_id',
            'FROM account a',
            'LEFT JOIN ltc_deposit_address da ON da.account_id = a.account_id',
            'WHERE a.currency_id = \'BTC\' AND da.address IS NULL'
        ].join('\n')
    }, function(err, dr) {
        cb(err, err ? null : dr.rows)
    })
}
