var ripple = require('ripple-lib')
, debug = require('debug')('snow:ripplebitcoinbridge')
, util = require('util')
, sjcl = require('ripple-lib/build/sjcl')
, num = require('num')
, async = require('async')

module.exports = exports = function(config) {
    exports.config = config

    // Connect to PostgreSQL
    var pg = config.pg_native ? require('pg')['native'] : require('pg')
    exports.conn = new pg.Client(config.pg_url)
    exports.conn.connect()

    // Connect to Ripple
    exports.connect(function() {
        exports.subscribe()
        exports.catchup()
    })
}

// Catch up on any transactions missed when bridge processor was not running.
exports.catchup = function() {
    var networkLedger
    , dbLedger

    async.series([
        // Fetch the current ledger
        function(cb) {
            exports.remote.request_ledger_current(function(err, ledger) {
                if (err) return cb(err)
                networkLedger = ledger.ledger_current_index
                cb()
            })
        },

        // Fetch last ledger processed
        function(cb) {
            var query = 'SELECT bitcoin_bridge_ledger_index ledger FROM settings'
            exports.conn.query(query, function(err, dr) {
                if (err) return cb(err)
                dbLedger = dr.rows[0].ledger || 3000000
                cb()
            })
        },

        // Catch up
        function(cb) {
            debug('catching up from ledger %s', dbLedger)

            exports.remote.request_account_tx({
                account: exports.config.ripple_account,
                ledger_index_min: dbLedger
            }, function(err, res) {
                if (err) {
                    console.error('catchup failed: %s', err.message)
                    return
                }

                async.forEachSeries(res.transactions, exports.transaction, cb)
            })
        },

        // Store database ledger index
        function(cb) {
            debug('storing current ledger as %s', networkLedger)

            exports.conn.query({
                text: 'UPDATE settings SET bitcoin_bridge_ledger_index = $1',
                values: [networkLedger]
            }, cb)
        }
    ], function(err) {
        if (err) {
            console.error('failed to catch up: %s', err.message)
            return
        }
        debug('catch up successful')
    })
}

// Subscribe to incoming transactions to the bridge account
exports.subscribe = function() {
    exports.account = exports.remote.add_account(exports.config.ripple_account)
    exports.account.on('transaction-inbound', exports.transaction)
}

// Marks the transaction as processed. The returned parameter stores
// whether the transaction was to be returned to sender.
exports.markProcessed = function(hash, returned, cb) {
    exports.conn.query({
        text: [
            'INSERT INTO ripple_processed (hash, returned)',
            'VALUES ($1, $2)'
        ].join('\n'),
        values: [hash, !!returned]
    }, function(err) {
        if (err) {
            if (err.message.match(/ripple_processed_pkey/)) {
                debug('transaciton %s has already been processed', hash)
                return cb(null, false)
            }

            return cb(err)
        }

        cb(null, true)
    })
}

// Return the specified transaction to its sender
exports.returnToSender = function(tran, cb) {
    debug('returning %s to sender %s', tran.hash, tran.Account)

    exports.markProcessed(tran.hash, true, function(err, res) {
        if (err) {
            console.error('failed to return %s to sender', tran.hash)
            console.error(err.message)
            return cb && cb(err)
        }

        if (!res) {
            debug('will not return duplicate transaction %s', tran.hash)
            return cb && cb(null, false)
        }

        var to = tran.Account
        if (tran.SourceTag) to += ':' + tran.SourceTag

        exports.remote.transaction(
            exports.config.ripple_account,
            to,
            tran.Amount,
            function(err) {
                if (!err) return cb && cb(null, true)
                console.error('failed to return %s to sender: %s', tran.hash, err.message)
                cb(err)
            }
        )
    })
}

// Process a transation. The format differs slightly between transaction-inbound
// and the result from account_tx (transaction field or tx field)
exports.transaction = function(tran, cb) {
    debug('transaction:\n%s', util.inspect(tran))

    if (tran.meta.TransactionResult != 'tesSUCCESS') {
        debug('ignoring tx with result %s', tran.meta.TransactionResult)
        return cb && cb()
    }

    var inner = tran.transaction || tran.tx


    if (inner.TransactionType != 'Payment') {
        debug('ignoring transaction of type %s', inner.TransactionType)
        return cb && cb()
    }

    if (inner.Destination != exports.config.ripple_account) {
        debug('ignoring transaction not to us (%s)', inner.Destination)
        return cb && cb()
    }

    if (inner.DestinationTag != 1) {
        debug('ignoring transaction with tag %s', inner.DestinationTag || '(none)')
        return cb && cb()
    }

    // At this point the transaction must be returned to the sender if it
    // cannot be bridged
    if (!inner.InvoiceID) {
        debug('returning transaction without InvoiceID')
        return exports.returnToSender(inner, cb)
    }

    if (typeof inner.Amount != 'object') {
        debug('returning transactions with XRP amount')
        return exports.returnToSender(inner, cb)
    }

    if (inner.Amount.currency != 'BTC') {
        debug('returning transactions of currency %s', inner.Amount.currency)
        return exports.returnToSender(inner, cb)
    }

    if (inner.Amount.issuer != exports.config.ripple_account) {
        debug('returning transaction with issuer %s', inner.Amount.issuer)
        return exports.returnToSender(inner, cb)
    }

    var address

    try {
        address = exports.parseInvoiceId(inner.InvoiceID)
    } catch (e) {
        debug('returning transaction with invalid invoice id', inner.InvoiceID)
        return exports.returnToSender(inner, cb)
    }

    // Credits are done in satoshis because floats are unsafe
    var satoshis = num(inner.Amount.value).mul(Math.pow(10, 8)).set_precision(0).toString()

    // Will not bridge smaller than 0.0001
    if (satoshis < 10000) {
        debug('returning transaction that is too small (under 0.0001)')
        return exports.returnToSender(inner, cb)
    }

    debug('interpreted as %s BTC (%s satoshis) to %s', inner.Amount.value, satoshis, address)

    // Mark the transaction as processed before briding it to avoid duplicates
    exports.markProcessed(inner.hash, false, function(err, res) {
        if (err) {
            console.error('failed to mark %s as processed: %s', inner.hash, err.message)
            return cb && cb(err)
        }

        if (!res) {
            debug('not queueing duplicate transaction %s for briding', inner.hash)
            return cb && cb()
        }

        // Queue the transaction to be picked up by the bitcoin sender
        exports.conn.query({
            text: 'SELECT create_ripple_bitcoin_bridge_withdraw_request($1, $2, $3, $4, $5) id',
            values: [
                inner.hash,
                inner.Account,
                inner.SourceTag === undefined ? null : inner.SourceTag,
                address,
                satoshis
            ]
        }, function(err, dr) {
            if (err) {
                debug('Failed to create request! need to return at this point')
                console.error(err.message)
                console.error(err.stack)
                return cb && cb(err)
            }

            var id = dr.rows[0].id

            if (!id) {
                debug('ignoring duplicate transaction %s', inner.hash)
                return cb && cb()
            }

            debug('successfully queued transaction for bridging (#%s)', id)
            cb && cb()
        })
    })
}

// Convert the transaction's invoice id to a Bitcoin address. The process
// is the exact reverse of that being done by the ripple-client
exports.parseInvoiceId = function(invoiceId) {
    // Remove trailing zeroes
    invoiceId = invoiceId.replace(/\.?0*$/, '')

    var decoded = sjcl.codec.hex.toBits(invoiceId)//.toUpperCase();
    decoded = sjcl.codec.bytes.fromBits(decoded)
    decoded = ripple.Base.encode(decoded, 'bitcoin');

    return decoded
}

exports.connect = function(cb) {
    debug('creating remote...')

    exports.remote = new ripple.Remote({
        trusted: true,
        local_signing: true,
        local_fee: true,
        fee_cusion: 1.5,
        servers: [
            {
                host: 's1.ripple.com',
                port: 443,
                secure: true
            }
        ]
    })

    exports.remote.set_secret(exports.config.ripple_account, exports.config.ripple_secret)

    exports.remote.connect(cb)
}
