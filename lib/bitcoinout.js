var debug = require('debug')('snow:bitcoinout')
, _ = require('underscore')
, num = require('num')
, util = require('util')
, raven = require('./raven')
, async = require('async')
, prefix = '[snow:bitcoinout]'

var BitcoinOut = module.exports = function(bitcoinEndpoint, dbClient) {
    var Bitcoin = require('bitcoin').Client
    this.bitcoin = new Bitcoin(bitcoinEndpoint)
    this.client = dbClient
    this.loop()
}

BitcoinOut.prototype.loop = function() {
    var that = this

    async.forever(function(cb) {
        that.work(function(err) {
            if (err) return cb(err)
            setTimeout(cb, 10e3)
        })
    }, function(err) {
        console.error('%s processing has failed. this should never happen.', prefix)
        console.error('%s', prefix, err)
        console.error('%s', prefix, err.stack)
    })
}

BitcoinOut.prototype.work = function(cb) {
    var that = this

    this.getBatch(function(err, requests) {
        if (err) return cb(err)
        if (!requests) return cb()
        debug('found %d requests', requests.length)
        that.executeBatch(requests, cb)
    })
}

BitcoinOut.prototype.getBatch = function(cb) {
    debug('retrieving batch')

    var query = 'SELECT * FROM pop_btc_withdraw_requests()'

    this.client.query(query, function(err, dr) {
        if (err) {
            console.error('%s failed to retrieve batch', prefix, err)
            return cb()
        }

        if (!dr.rowCount) {
            debug('no withdraws are pending')
            return cb()
        }

        cb(null, dr.rows)
    })
}

BitcoinOut.prototype.abortRequest = function(request, error, cb) {
    this.client.query({
        text: 'SELECT cancel_withdraw_request($1, $2)',
        values: [request.request_id, error || null]
    }, cb)
}

// returns only the valid addresses
BitcoinOut.prototype.validateAddresses = function(requests, cb) {
    var that = this
    , validRequests = []

    async.each(requests, function(request, cb) {
        that.bitcoin.validateAddress(request.address, function(err, res) {
            if (err) {
                console.error('%s failed to validate address %s', prefix, request.address)
                return cb()
            }

            var valid = res.isvalid

            if (!valid) {
                console.error('%s address %s is invalid, trying to abort', prefix, request.address)

                return that.abortRequest(request, 'invalid address', function(err) {
                    if (err) {
                        console.error('%s failed to abort request with invalid address %s', prefix, request.request_id)
                        return cb()
                    }

                    debug('the request %s was aborted', request.request_id)

                    cb()
                })
            }

            debug('address %s validated %j', request.address, valid)
            validRequests.push(request)
            cb()
        })
    }, function(err) {
        if (err) return cb(err)
        cb(null, validRequests)
    })
}

BitcoinOut.prototype.executeBatch = function(requests, cb) {
    async.waterfall([
        this.validateAddresses.bind(this, requests),
        function(requests, next) {
            if (!requests.length) {
                debug('no requests are valid, skipping this batch')
                return cb()
            }
            next(null, requests)
        },
        this.sendBatch.bind(this)
    ], cb)
}

// converts requests into a command to sendMany
BitcoinOut.prototype.formatRequestsToSendMany = function(requests) {
    return requests.reduce(function(r, i) {
        var amount = +num(i.amount, i.scale)
        r[i.address] = +num(r[i.address] || 0).add(amount)
        return r
    }, {})
}

// attempts to re-queue the items (no longer processing, but requested)
BitcoinOut.prototype.reQueue = function(requests, cb) {
    debug('insufficient balance to send, trying to put requests back in queue')

    var ids = _.pluck(requests, 'request_id')

    return this.client.query(
        ['UPDATE withdraw_request SET state = \'requested\'',
        'WHERE request_id IN (' + ids.join(', ') + ')'
    ].join('\n'), cb)
}

BitcoinOut.prototype.sendBatch = function(requests, cb) {
    var that = this

    debug('will send %d transactions', requests.length)
    debug(util.inspect(requests))

    var cmd = this.formatRequestsToSendMany(requests)

    debug('formatted requests:')
    debug(util.inspect(cmd))

    this.bitcoin.sendMany('', cmd, function(err, res) {
        if (!err) {
            debug('send requests successful')
            debug(util.inspect(res))

            return async.each(requests, that.markRequestCompleted.bind(that), function(err) {
                if (!err) {
                    debug('succeeded in marking requests as done')
                    return cb()
                }

                console.error('%s failed to mark item as done', prefix)
                console.error('%s', prefix, err)
                cb()
            })
        }

        if (err.code == -6) {
            debug('request failed because wallet is lacking funds')
            debug('trying to re-queue requests')

            return that.reQueue(requests, function(err) {
                if (!err) {
                    debug('succeeded in requeing the requests')
                    return cb()
                }

                console.error('%s failed to requeue the requests', prefix)
                console.error('%s', prefix, err)
                return cb()
            })
        }

        console.error('%s not sure why the request failed. requests will remain uncertain', prefix)
        console.error(prefix, err)
        cb()
    })
}

// mark request as completed
BitcoinOut.prototype.markRequestCompleted = function(request, cb) {
    debug('marking item done %s', request.request_id)

    this.client.query({
        text: 'SELECT confirm_withdraw($1)',
        values: [request.request_id]
    }, cb)
}
