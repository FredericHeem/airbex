var Q = require('q')
, num = require('num')
, async = require('async')
, debug = require('debug')('snow:litecoinin')

var LitecoinIn = module.exports = function(ep, dbClient, minConf) {
    var Client = require('bitcoin').Client
    this.litecoin = new Client(ep)
    this.minConf = minConf || 6
    console.log('litecoinin minconf %d', minConf)

    this.client = dbClient
    this.loop().done()
}

LitecoinIn.prototype.loop = function() {
    var that = this
    return this.processNewBlocks()
    .then(function(result) {
        if (result) {
            debug('litecoinin checking for more work immediately')
            return that.loop()
        }

        return Q.delay(10e3)
        .then(function() {
            return that.loop()
        })
    })
}

LitecoinIn.prototype.processTx = function(txid) {
    var that = this
    return Q.ninvoke(this.litecoin, 'getTransaction', txid)
    .then(function(tx) {
        if (!tx.details) return
        if (tx.details.length !== 1) throw new Error('more than one detail')
        var detail = tx.details[0]
        if (detail.category !== 'receive') return debug('not received')
        var address = detail.address

        return Q.ninvoke(that.client, 'query', {
            text: 'SELECT COUNT(*) count FROM ltc_deposit_address WHERE address = $1',
            values: [address]
        }).get('rows').get(0).get('count').then(function(internal) {
            if (!internal) {
                return console.error(
                    'address for wallet transaction %s is not in database',
                    txid)
            }

            var satoshi = +num(detail.amount).mul(1e8)

            return Q.ninvoke(that.client, 'query', {
                text: 'SELECT ltc_credit($1, $2, $3) tid',
                values: [txid, address, satoshi]
            })
            .then(function(res) {
                return res.rows[0].tid
            }, function(err) {
                if (err.code === '23505') {
                    return console.log('Ignoring duplicate tx %s', txid)
                }

                throw err
            })
        })
    }, function(err) {
        if (err.message === 'Invalid or non-wallet transaction id') return
        throw err
    })
}

LitecoinIn.prototype.getBlock = function(hash) {
    return Q.ninvoke(this.litecoin, 'getBlock', hash)
}

LitecoinIn.prototype.analyzeBlock = function(block) {
    var that = this

    debug('processing %d transactions', block.tx.length)

    var d = Q.defer()

    async.eachLimit(block.tx, 100, function(tx, next) {
        that.processTx(tx)
        .then(function() {
            next()
        }, function(err) {
            next(err)
        })
    }, function(err) {
        err ? d.reject(err) : d.resolve()
    })

    return d.promise
}

LitecoinIn.prototype.processNewBlocks = function() {
    var that = this

    return Q.all([
        Q.ninvoke(this.client, 'query', 'SELECT litecoin_height FROM settings')
        .get('rows').get(0).get('litecoin_height'),
        Q.ninvoke(this.litecoin, 'getBlockCount').then(function(result) {
            return result
        }, function(err) {
            console.error('failed to getblockcount from litecoind')
            throw err
        })
    ]).then(function(heights) {
        var lastHeight = heights[0]

        debug('litecoin heights: internal=%s; client=%s', lastHeight, heights[1])

        if (heights[1] < lastHeight + that.minConf) return null

        return Q.ninvoke(that.litecoin, 'getBlockHash', lastHeight + 1)
        .then(function(hash) {
            return that.getBlock(hash)
            .then(that.analyzeBlock.bind(that), function(err) {
                throw err
            })
            .then(function() {
                return Q.ninvoke(that.client, 'query', {
                    text: 'UPDATE settings SET litecoin_height = $1',
                    values: [lastHeight + 1]
                })
            })
        })
    })
}
