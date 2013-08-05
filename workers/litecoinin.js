var num = require('num')
, async = require('async')
, debug = require('debug')('snow:litecoinin')
, _ = require('lodash')

module.exports = exports = function(o) {
    _.extend(exports, { minConf: 6 }, o)
    debug('configured with min conf = %d', exports.minConf)
    if (!exports.start) return
    async.forever(function(cb) {
        exports.check(function(err) {
            if (err) throw err
            setTimeout(cb, 5e3)
        })
    })
}

exports.getDbHeight = function(cb) {
    if (exports.dbHeight) return cb(null, exports.dbHeight)
    debug('looking up db height...')
    var q = 'SELECT litecoin_height FROM settings'
    exports.db.query(q, function(err, dr) {
        if (err) return cb(err)
        exports.dbHeight = dr.rows[0].litecoin_height
        debug('db height found at %s', exports.dbHeight)
        cb(null, exports.dbHeight)
    })
}

exports.setDbHeight = function(height, cb) {
    debug('setting db height to %d...', height)
    exports.dbHeight = height
    exports.db.query({
        text: 'UPDATE settings SET litecoin_height = $1',
        values: [height]
    }, cb)
}

exports.check = function(cb) {
    debug('looking for new blocks...')
    async.parallel({
        db: exports.getDbHeight,
        daemon: exports.daemon.getBlockCount.bind(exports.daemon)
    }, function(err, res) {
        if (err) return cb(err)
        var n = res.db + 1
        async.whilst(function() {
            return n + exports.minConf <= res.daemon
        }, function(cb) {
            async.waterfall([
                exports.daemon.getBlockHash.bind(exports.daemon, n),
                exports.daemon.getBlock.bind(exports.daemon),
                exports.processBlock,
                exports.setDbHeight.bind(null, n)
            ], function(err) {
                if (err) return cb(err)
                debug('finished with block #%d', n)
                n++
                cb()
            })
        }, cb)
    })
}

exports.credit = function(txid, address, satoshis, cb) {
    exports.db.query({
        text: 'SELECT address FROM ltc_deposit_address WHERE address = $1',
        values: [address]
    }, function(err, dr) {
        if (err) return cb(err)
        if (!dr.rowCount) {
            console.error('Address %s for tx %s not in db', address, txid)
            return cb()
        }
        exports.db.query({
            text: 'SELECT ltc_credit($1, $2, $3) tid',
            values: [txid, address, satoshis]
        }, function(err, dr) {
            if (err && err.code == '23505') {
                console.log('Ignoring duplicate tx %s', txid)
                return cb()
            }
            if (err) return cb(err)
            cb(null, dr.rows[0].tid)
        })
    })
}

exports.processBlock = function(block, cb) {
    debug('processing %d transactions', block.tx.length)
    async.eachLimit(block.tx, 3, exports.processTx, cb)
}

exports.processTx = function(txid, cb) {
    exports.daemon.getTransaction(txid, function(err, tx) {
        if (err && err.message.match(/^Invalid or non-wallet/)) return cb()
        if (err) return cb(err)
        if (!tx.details) return cb()
        if (tx.details.length != 1) return cb(new Error('more than one detail'))
        var detail = tx.details[0]
        if (detail.category !== 'receive') return cb()
        var address = detail.address
        , satoshis = +num(detail.amount).mul(1e8)
        exports.credit(txid, address, satoshis, cb)
    })
}
