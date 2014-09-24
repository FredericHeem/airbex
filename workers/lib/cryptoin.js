var num = require('num')
, async = require('async')
, log = require('../log')(__filename)
, debug = log.debug
, _ = require('lodash')
, EventEmitter = require('events').EventEmitter
, util = require('util')

var CryptoIn = module.exports = function(ep, db) {
    _.bindAll(this)
    var that = this
    , Bitcoin = require('bitcoin').Client
    this.bitcoin = new Bitcoin(ep)
    this.minConf = ep.minConf || 3
    this.db = db
    this.currency = ep.currency
    this.scale = ep.scale || 8
    this.currencyLC = this.currency.toLowerCase();
    
    async.forever(function(cb) {
        that.check(function(err) {
            if (err) {
                log.error(err)
                //that.emit(err)
            }
            setTimeout(cb, 5e3)
        })
    })
}

util.inherits(CryptoIn, EventEmitter)

CryptoIn.prototype.getDbHeight = function(cb) {
    if (this.dbHeight) return cb(null, this.dbHeight)
    var that = this
    , query = {
            text: 'SELECT height FROM wallet where currency_id=$1', 
            values:[this.currency]
    }
    this.db.query(query, function(err, dr) {
        if (err) return cb(err)
        if(dr.rows.length){
            that.dbHeight = dr.rows[0].height
        } else {
            that.dbHeight = 0;
        }
        debug("getDbHeight: ", that.dbHeight)
        cb(null, that.dbHeight)
    })
}

CryptoIn.prototype.setDbBalance = function(val, cb) {
    debug("setDbBalance: %s, currency: %s", val, this.currency)
    this.db.query({
        text: 'UPDATE wallet SET balance = $1 where currency_id=$2',
        values: [val, this.currency]
    }, cb)
}

CryptoIn.prototype.setDbHeight = function(val, cb) {
    debug("dbHeight %s", val);
    this.dbHeight = val
    this.db.query({
        text: 'UPDATE wallet SET height = $1 where currency_id=$2',
        values: [val, this.currency]
    }, cb)
}

CryptoIn.prototype.check = function(cb) {
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

CryptoIn.prototype.processOutput = function(txid, o, cb) {
    if (!o.scriptPubKey) return cb(new Error('scriptPubKey missing'))
    if (!o.scriptPubKey.addresses) return cb()
    if (o.scriptPubKey.addresses.length !== 1) return cb()
    var address = o.scriptPubKey.addresses[0]
    , satoshi = +num(o.value.toFixed(this.scale)).mul(Math.pow(10, this.scale))
    
    var queryText =
            [
             "SELECT crypto_credit($1, $2, $3, $4) tid",
             "FROM crypto_deposit_address",
             "WHERE address = $3 AND currency_id = $1"
         ].join('\n');
    
    this.db.query({
        text: queryText,
        values: [this.currency, txid, address, satoshi]
    }, function(err, dr) {
        //debug("processOutput currency: %s, txid: %s, address: %s, satoshi: %s",  this.currency, txid, address, satoshi)

        if (err) {
            debug("processOutput currency: %s, txid: %s, address: %s, satoshi: %s, error: %s", 
                    this.currency, txid, address, satoshi, JSON.stringify(err));
            if (err.code === '23505') {
                console.log('Skipped duplicate CryptoIn transaction %s', txid)
                return cb()
            }
            return cb(err)
        }
        if (!dr.rowCount) return cb()
        log.info('Credited %s with %s %s from %s (internal %s)',
            address, o.value, this.currency, txid, dr.rows[0].tid)
        cb(null, dr.rows[0].tid)
    })
}

CryptoIn.prototype.processTx = function(txid, cb) {
    var that = this
    async.waterfall([
        this.bitcoin.getRawTransaction.bind(this.bitcoin, txid),
        this.bitcoin.decodeRawTransaction.bind(this.bitcoin),
        function(tx, cb) {
            async.each(tx.vout, that.processOutput.bind(that, txid), cb)
        }
    ], cb)
}

CryptoIn.prototype.processBlock = function(block, cb) {
    debug('processing %d transactions', block.tx.length)
    async.eachLimit(block.tx, 3, this.processTx, cb)
}
