var sjcl = require('../vendor/sjcl/sjcl')
, _ = require('lodash')
, debug = require('./debug')('uptodate')

module.exports = exports = function(fn, cb, opts) {
    opts = _.defaults(opts || {}, {
        maxInterval: 60e3,
        interval: 5e3,
        retryInterval: 5e3,
        factor: 2,
        now: true
    })

    debug('starting')

    var interval = opts.interval
    , timer
    , lastHash

    function refresh() {
        fn()
        .fail(function(err) {
            debug('failed to refresh: %s', err.message)

            timer || (cb && cb(err))
            timer = null

            debug('retrying in %ds', opts.retryInterval/1e3)

            queue(opts.retryInterval)
        })
        .done(function(res) {
            cb && cb(null, res)

            var hash = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(
                JSON.stringify(res)
            ))

            if (lastHash) {
                if (hash == lastHash && interval < opts.maxInterval) {
                    interval = Math.min(interval * opts.factor, opts.maxInterval)
                }

                if (hash !== lastHash) {
                    interval = opts.interval
                }
            }

            lastHash = hash

            timer = null
            queue(interval)
        })
    }

    function queue(interval) {
        timer && clearTimeout(timer)
        debug('queue to run in %ss', interval / 1e3)
        timer = setTimeout(refresh, interval)
    }

    opts.now ? refresh() : queue(interval)

    return {
        stop: function() {
            timer && clearTimeout(timer)
            timer = null
        }
    }
}
