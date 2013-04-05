var Q = require('q')
, util = require('util')
, semaphore = require('semaphore')

var BitcoinIn = module.exports = function(bitcoinEndpoint, dbClient, minConf) {
    var Bitcoin = require('bitcoin').Client
    this.bitcoin = new Bitcoin(bitcoinEndpoint)
    this.minConf = minConf || 3
    this.sem = semaphore(512)
    
    this.client = dbClient
    this.loop().done()
}

BitcoinIn.prototype.loop = function() {
    var that = this
    return this.processNewBlocks()
    .then(function(result) {
        if (result) return that.loop()
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
        return 'skipped'
    }

    if (o.scriptPubKey.addresses.length !== 1) {
        return
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
        return Q.ninvoke(that.bitcoin, 'decodeRawTransaction', raw)
    })
    .get('vout')
    .then(function(outs) {
        return Q.all(outs.map(function(o) {
            return that.processOutput(o, txid)
        }))
    })
}

BitcoinIn.prototype.getBlock = function(hash) {
    return Q.ninvoke(this.bitcoin, 'getBlock', hash)
}

BitcoinIn.prototype.analyzeBlock = function(block) {
    var that = this

    console.log('processing %d transactions', block.tx.length)

    return Q.all(block.tx.map(function(id) {
        var d = Q.defer()

        that.sem.take(function(leave) {
            that.processTx(id)
            .then(function() {
                leave()
                q.resolve()
            })
        })

        return d
    }))
}

BitcoinIn.prototype.processNewBlocks = function() {
    var that = this

    return Q.all([
        Q.ninvoke(this.client, 'query', 'SELECT MAX(height) height FROM btc_block').get('rows').get(0).get('height'),
        Q.ninvoke(this.bitcoin, 'getBlockCount').then(function(result) {
            return result
        }, function(err) {
            console.error('failed to getblockcount from bitcoind')
            throw err
        })
    ]).then(function(heights) {
        var lastHeight = heights[0]
        console.log('bitcoin heights: internal=%s; client=%s', lastHeight, heights[1])

        if (heights[1] < lastHeight + that.minConf) return null

        return Q.ninvoke(that.bitcoin, 'getBlockHash', lastHeight + 1)
        .then(function(hash) {
            return that.getBlock(hash)
            .then(that.analyzeBlock.bind(that))
            .then(function() {
                return Q.ninvoke(that.client, 'query', {
                    text: 'INSERT INTO btc_block (hash, height) VALUES ($1, $2)',
                    values: [hash, lastHeight + 1]
                })
            })
        })
    })
}
