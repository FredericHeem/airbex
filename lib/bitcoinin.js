var config = require('../config')
, debug = require('debug')('snow:bitcoinin')
, db = require('./db')
, Q = require('q')
, util = require('util')
, minConf = 0

var BitcoinIn = module.exports = function() {
    this.bitcoin = new (require('bitcoin').Client)(config.BTC)
    this.client = db()
    this.loop.done()
}

BitcoinIn.prototype.loop = function() {
    var that = this
    this.processNewBlocks()
    .then(function(result) {
        if (r) return that.loop()
        return Q.delay(10e3)
        .then(function() {
            return that.loop()
        })
    })
}

BitcoinIn.prototype.processOutput = function(o, txid) {
    var that = this

    if (!o.scriptPubKey) throw new Error('scriptPubKey missing')

    if (!o.scriptPubKey.addresses) {
        debug('addresses missing from output ' + util.inspect(o.scriptPubKey));
        return 'skipped'
    }

    if (o.scriptPubKey.addresses.length !== 1) {
        throw new Error(o.scriptPubKey.addresses.length + ' addresses')
    }

    var address = o.scriptPubKey.addresses[0]

    return Q.ninvoke(this.client, 'query', {
        text: 'SELECT COUNT(*) count FROM btc_deposit_address WHERE address = $1',
        values: [address]
    }).get('rows').get(0).get('count').then(function(internal) {
        if (!internal) return 'external address'
        var satoshi = o.value * 1e8

        return Q.ninvoke(that.client, 'query', {
            text: 'SELECT btc_credit($1, $2, $3) tid',
            values: [txid, address, satoshi]
        }).fail(function(err) {
            if (err.code === '23505') return 'duplicate tx'
            throw err
        }).get('rows').get(0).get('tid')
    })
}

BitcoinIn.prototype.processTx = function(txid) {
    var that = this
    return Q.ninvoke(this.bitcoin, 'getRawTransaction', txid)
    .then(function(raw) {
        debug('analyzing tx ' + txid)
        return Q.ninvoke(that.bitcoin, 'decodeRawTransaction', raw)
    })
    .get('vout')
    .then(function(outs) {
        return Q.spread(outs.map(function(o) {
            return Q.fcall(that.processOutput, o, txid)
        }), function() { })
    })
}

BitcoinIn.prototype.getBlock = function(hash) {
    debug('getting block ' + hash)
    return Q.ninvoke(this.bitcoin, 'getBlock', hash)
}

BitcoinIn.prototype.analyzeBlock = function(block) {
    var that = this
    debug('analyzing block')

    return Q.all(block.tx.map(function(id) {
        return that.processTx(id)
    }))
}

BitcoinIn.prototype.processNewBlocks = function() {
    var that = this
    debug('processing new blocks')

    return Q.all([
        Q.ninvoke(this.client, 'query', 'SELECT MAX(height) height FROM btc_block').get('rows').get(0).get('height'),
        Q.ninvoke(this.bitcoin, 'getBlockCount')
    ]).then(function(heights) {
        var lastHeight = heights[0]
        debug('heights: internal=' + lastHeight + '; network=' + heights[1])

        if (heights[1] <= lastHeight + minConf) return null
        debug('analyzing block at height ' + lastHeight + 1)

        return Q.ninvoke(that.bitcoin, 'getBlockHash', lastHeight + 1)
        .then(function(hash) {
            debug('analyzing block with hash ' + hash)

            return that.getBlock(hash)
            .then(that.analyzeBlock)
            .then(function() {
                return Q.ninvoke(that.client, 'query', {
                    text: 'INSERT INTO btc_block (hash, height) VALUES ($1, $2)',
                    values: [hash, lastHeight + 1]
                })
            })
        })
    })
    .fail(function(err) {
        console.error(err)
        console.error(err.stack)
    })
}
