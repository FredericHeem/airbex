var _ = require('lodash')

exports.format = function(app, row) {
    var destination

    if (row.method == 'BTC') {
        destination = row.bitcoin_address
    } else if (row.method == 'LTC') {
        destination = row.litecoin_address
    } else if (row.method == 'ripple') {
        destination = row.ripple_address
    } else if (row.method == 'bank'){
        destination = row.bank_account_number ||
            row.bank_iban + ' (' + row.bank_swiftbic + ')'
    }

    if (!destination) {
        throw new Error('Unknown destination for ' + JSON.stringify(row))
    }

    return _.extend({
        currency: row.currency_id,
        amount: app.cache.formatCurrency(row.amount, row.currency_id),
        id: row.request_id,
        destination:  destination,
        created: row.created_at,
        user: row.user_id
    }, _.pick(row, 'completed', 'method', 'state', 'error'))
}

exports.query = function(app, opts, cb) {
    var text = [
        'SELECT *',
        'FROM withdraw_request_view',
        'WHERE TRUE'
    ]
    , values = []

    if (opts.activeOnly) {
        text.push('AND state NOT IN (\'cancelled\', \'completed\')')
    }

    if (opts.user_id) {
        text.push('AND user_id = $1')
        values.push(opts.user_id)
    }

    app.conn.read.query({
        text: text.join('\n'),
        values: values
    }, function(err, dr) {
        if (err) return cb(err)
        cb(null, dr.rows.map(exports.format.bind(exports, app)))
    })
}
