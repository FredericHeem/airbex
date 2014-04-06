var num = require('num')
, async = require('async')
, debug = require('debug')('snow:bitcoinin')
, _ = require('lodash')
, EventEmitter = require('events').EventEmitter
, util = require('util')

var BitcoinIn = module.exports = function(ep, db, minConf) {
    _.bindAll(this)
    var that = this
    , Bitcoin = require('bitcoin').Client
    this.bitcoin = new Bitcoin(ep)
    this.minConf = minConf || 3
    this.db = db
    async.forever(function(cb) {
        that.check(function(err) {
            if (err) {
                console.error(err)
                that.emit(err)
            }
            setTimeout(cb, 5e3)
        })
    })
}

util.inherits(BitcoinIn, EventEmitter)

BitcoinIn.prototype.getDbHeight = function(cb) {
    if (this.dbHeight) return cb(null, this.dbHeight)
    var that = this
    , query = 'SELECT bitcoin_height FROM settings'
    this.db.query(query, function(err, dr) {
        if (err) return cb(err)
        that.dbHeight = dr.rows[0].bitcoin_height
        cb(null, that.dbHeight)
    })
}

BitcoinIn.prototype.setDbBalance = function(val, cb) {
    this.db.query({
        text: 'UPDATE settings SET btc_balance = $1',
        values: [val]
    }, cb)
}

BitcoinIn.prototype.setDbHeight = function(val, cb) {
    this.dbHeight = val
    this.db.query({
        text: 'UPDATE settings SET bitcoin_height = $1',
        values: [val]
    }, cb)
}

BitcoinIn.prototype.check = function(cb) {
    var that = this
    async.parallel({
        db: this.getDbHeight,
        bitcoind: this.bitcoin.getBlockCount.bind(this.bitcoin)
    }, function(err, res) {
        if (err) return cb(err)
        var n = res.db + 1
        async.whilst(function() {
            return n + that.minConf <= res.bitcoind
        }, function(cb) {
            async.waterfall([
                that.bitcoin.getBlockHash.bind(that.bitcoin, n),
                that.bitcoin.getBlock.bind(that.bitcoin),
                that.processBlock,
                that.setDbHeight.bind(that, n),
                function(dr, cb) {
                    that.bitcoin.getBalance(cb)
                },
                that.setDbBalance
            ], function(err) {
                if (err) return cb(err)
                debug('Finished with block #%d', n)
                n++
                cb()
            })
        }, cb)
    })
}

BitcoinIn.prototype.processOutput = function(txid, o, cb) {
    if (!o.scriptPubKey) return cb(new Error('scriptPubKey missing'))
    if (!o.scriptPubKey.addresses) return cb()
    if (o.scriptPubKey.addresses.length !== 1) return cb()
    var address = o.scriptPubKey.addresses[0]
    , satoshi = +num(o.value.toFixed(8)).mul(1e8)
    this.db.query({
        text: [
            'SELECT btc_credit($1, $2, $3) tid',
            'FROM btc_deposit_address',
            'WHERE address = $2'
        ].join('\n'),
        values: [txid, address, satoshi]
    }, function(err, dr) {
        if (err) {
            if (err.code === '23505') {
                console.log('Skipped duplicate Bitcoin transaction %s', txid)
                return cb()
            }
            return cb(err)
        }
        if (!dr.rowCount) return cb()
        console.log('Credited %s with %s BTC from %s (internal %s)',
            address, o.value, txid, dr.rows[0].tid)
        cb(null, dr.rows[0].tid)
    })
}

BitcoinIn.prototype.processTx = function(txid, cb) {
    var that = this
    async.waterfall([
        this.bitcoin.getRawTransaction.bind(this.bitcoin, txid),
        this.bitcoin.decodeRawTransaction.bind(this.bitcoin),
        function(tx, cb) {
            async.each(tx.vout, that.processOutput.bind(that, txid), cb)
        }
    ], cb)
}

BitcoinIn.prototype.processBlock = function(block, cb) {
    debug('processing %d transactions', block.tx.length)
    async.eachLimit(block.tx, 3, this.processTx, cb)
}
