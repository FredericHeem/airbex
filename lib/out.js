var Out = module.exports = {}
, debug = require('debug')('snow:out')
, prefix = 'snow:out'

Out.cancelRequest = function(client, request, error, cb) {
    debug('cancelling request %s', request.request_id)

    client.query({
        text: 'SELECT cancel_withdraw_request($1, $2)',
        values: [request.request_id, error || null]
    }, function(err) {
        if (err) return cb(err)
        debug('request %s cancelled', request.request_id)
        cb()
    })
}

Out.popBatch = function(client, currency, cb) {
    debug('retrieving batch')

    var query = 'SELECT * FROM pop_' + currency + '_withdraw_requests()'

    client.query(query, function(err, dr) {
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

// attempts to re-queue the items (no longer processing, but requested)
Out.reQueue = function(client, requests, cb) {
    var ids = _.pluck(requests, 'request_id')

    return client.query(
        ['UPDATE withdraw_request SET state = \'requested\'',
        'WHERE request_id IN (' + ids.join(', ') + ')'
    ].join('\n'), cb)
}

// mark request as completed
Out.markRequestCompleted = function(client, request, cb) {
    debug('marking item done %s', request.request_id)

    client.query({
        text: 'SELECT confirm_withdraw($1)',
        values: [request.request_id]
    }, cb)
}
