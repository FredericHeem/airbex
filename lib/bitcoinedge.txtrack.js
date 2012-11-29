var config = require('../config')
, bitcoin = new (require('bitcoin').Client)(config('BTC'))
, db = require('./db')
, Q = require('q')
, util = require('util')
, client
, minConf = 0

function processOutput(o, txid) {
    if (!o.scriptPubKey) throw new Error('scriptPubKey missing')

    if (!o.scriptPubKey.addresses) {
        debug('addresses missing from output ' + util.inspect(o.scriptPubKey));
        return 'skipped'
    }

    if (o.scriptPubKey.addresses.length !== 1) {
        throw new Error(o.scriptPubKey.addresses.length + ' addresses')
    }

    var address = o.scriptPubKey.addresses[0]

    return Q.ninvoke(client, 'query', {
        text: 'SELECT COUNT(*) count FROM btc_deposit_address WHERE address = $1',
        values: [address]
    }).get('rows').get(0).get('count').then(function(internal) {
        if (!internal) return 'external address'
        var satoshi = o.value * 1e8

        return Q.ninvoke(client, 'query', {
            text: 'SELECT btc_credit($1, $2, $3) tid',
            values: [txid, address, satoshi]
        }).fail(function(err) {
            if (err.code === '23505') return 'duplicate tx'
            throw err
        }).get('rows').get(0).get('tid')
    })
}

function processTx(txid) {
    return Q.ninvoke(bitcoin, 'getRawTransaction', txid)
    .then(function(raw) {
        debug('analyzing tx ' + txid)
        return Q.ninvoke(bitcoin, 'decodeRawTransaction', raw)
    })
    .get('vout')
    .then(function(outs) {
        return Q.spread(outs.map(function(o) {
            return Q.fcall(processOutput, o, txid)
        }), function() { })
    })
}

function getBlock(hash) {
    debug('getting block ' + hash)
    return Q.ninvoke(bitcoin, 'getBlock', hash)
}

function analyzeBlock(block) {
    debug('analyzing block')
    return Q.spread(block.tx.map(function(id) {
        return Q.fcall(processTx, id)
    }), function() { })
}

function processNewBlocks() {
    client = db()
    debug('processing new blocks')

    return Q.all([
        Q.ninvoke(client, 'query', 'SELECT MAX(height) height FROM btc_block').get('rows').get(0).get('height'),
        Q.ninvoke(bitcoin, 'getBlockCount')
    ]).then(function(heights) {
        var lastHeight = heights[0]
        if (heights[1] <= lastHeight + minConf) return 'no work'
        debug('analyzing block at height ' + lastHeight + 1)

        return Q.ninvoke(bitcoin, 'getBlockHash', lastHeight + 1)
        .then(function(hash) {
            debug('analyzing block with hash ' + hash)

            return getBlock(hash)
            .then(analyzeBlock)
            .then(function() {
                return Q.ninvoke(client, 'query', {
                    text: 'INSERT INTO btc_block (hash, height) VALUES ($1, $2)',
                    values: [hash, lastHeight + 1]
                })
            })
        })
    })
    .fin(function() {
        return Q.invoke(client, 'end').then(function() {
            client = null
        })
    })
    .fail(function(err) {
        console.error(err)
        console.error(err.stack)
    })
}

module.exports = function() {
    var timer
    , loop = function() {
        processNewBlocks().then(function(r) {
            if (r) return loop()

            debug('scheduling next loop')
            timer = setTimeout(loop, 10 * 1000)
        }).done()
    }

    loop()

    process.on('exit', function() {
        timer && clearTimeout(timer)
    })
}

if (process.argv[1].match(/bitcoinedge.txtrack.js$/)) {
    module.exports()
}