var _ = require('lodash')
, format = require('util').format
, builder = require('pg-builder')

exports.formatDestination = function(row) {
    if (row.method == 'BTC') {
        return row.bitcoin_address
    } else if (row.method == 'LTC') {
        return row.litecoin_address
    } else if (row.method == 'ripple') {
        return row.ripple_address
    } else if (row.method == 'bank') {
        if (row.bank_iban && row.bank_swiftbic) {
            // IBAN + SWIFT/BIC
            return format('IBAN: %s, SWIFT: %s%s', row.bank_iban, row.bank_swiftbic,
                row.bank_force_swift ? ' (No SEPA)' : '')
        } else if (row.bank_swiftbic) {
            // International
            if (row.bank_routing_number) {
                return format('Account: %s, SWIFT: %s, Rtn: %s',
                    row.bank_account_number, row.bank_swiftbic, row.bank_routing_number)
            } else {
                return format('Account: %s, SWIFT: %s',
                    row.bank_account_number, row.bank_swiftbic)
            }
        } else if (row.bank_account_number) {
            // Domestic
            return format('Domestic: %s', row.bank_account_number)
        }
    }
}

exports.format = function(app, row) {
    var destination = exports.formatDestination(row)

    if (!destination) {
        throw new Error('Unknown destination for ' + JSON.stringify(row))
    }

    return _.extend({
        currency: row.currency_id,
        amount: app.cache.formatCurrency(row.amount, row.currency_id),
        id: row.request_id,
        destination:  destination,
        created: row.created_at,
        user: row.user_id,
        completed: row.completed_at
    }, _.pick(row, 'completed', 'method', 'state', 'error'))
}

exports.query = function(app, opts, cb) {
    var q = builder()
    .f('withdraw_request_view')
    .s('*')

    if (opts.activeOnly) {
        q = q.w('state NOT IN (\'cancelled\', \'completed\')')
    }

    if (opts.user_id) {
        q = q.w('user_id = ${userId}')
        q = q.p('userId', opts.user_id)
    }

    app.conn.read.query(q, function(err, dr) {
        if (err) return cb(err)
        cb(null, dr.rows.map(exports.format.bind(exports, app)))
    })
}
