var _ = require('lodash')

module.exports = exports = function(app) {
    app.del('/v1/withdraws/:id', app.auth.withdraw, exports.cancel)
    app.get('/v1/withdraws', app.auth.any, exports.index)
    app.post('/v1/withdraws/bank', app.auth.withdraw, exports.withdrawBank)
}

exports.withdrawBank = function(req, res, next) {
    if (!req.app.validate(req.body, 'v1/withdraw_bank', res)) return

    if (!req.apiKey.canWithdraw) {
        return res.send(401, {
            name: 'MissingApiKeyPermission',
            message: 'Must have withdraw permission'
        })
    }

    req.app.conn.write.query({
        text: [
            'SELECT withdraw_bank($2, $3, $4)',
            'FROM bank_account',
            'WHERE bank_account_id = $2 AND user_id = $1'
        ].join('\n'),
        values: [
            req.user,
            +req.body.bankAccount,
            req.body.currency,
            req.app.cache.parseCurrency(req.body.amount, req.body.currency)
        ]
    }, function(err, dr) {
        if (err) {
            if (err.message.match(/non_negative_available/)) {
                return res.send(500, {
                    name: 'NoFunds',
                    message: 'Insufficient funds.'
                })
            }
            return next(err)
        }

        if (!dr.rowCount) {
            return res.send(400, {
                name: 'BankAccountNotFound',
                message: 'Bank account not found for this user'
            })
        }

        return res.send(204)
    })
}

exports.index = function(req, res, next) {
    req.app.conn.read.query({
        text: 'SELECT * FROM withdraw_request_view WHERE user_id = $1',
        values: [req.user]
    }, function(err, dr) {
        if (err) return next(err)
        res.send(dr.rows.map(function(row) {
            var destination

            if (row.method == 'BTC') {
                destination = row.bitcoin_address
            } else if (row.method == 'LTC') {
                destination = row.litecoin_address
            } else if (row.method == 'ripple') {
                destination = row.ripple_address
            } else if (row.method == 'bank'){
                destination = row.bank_account_id
            }

            if (!destination) {
                return next(new Error('Unknown destination for ' + JSON.stringify(row)))
            }

            return _.extend({
                currency: row.currency_id,
                amount: req.app.cache.formatCurrency(row.amount, row.currency_id),
                id: row.request_id,
                destination:  destination,
                created: row.created_at
            }, _.pick(row, 'completed', 'method', 'state', 'error'))
        }))
    })
}

exports.cancel = function(req, res, next) {
    if (!req.apiKey.canWithdraw) {
        return res.send(401, {
            name: 'MissingApiKeyPermission',
            message: 'Must have withdraw permission'
        })
    }

    req.app.conn.write.query({
        text: [
            'SELECT cancel_withdraw_request($1, null) request_id',
            'FROM withdraw_request wr',
            'INNER JOIN account a ON a.account_id = wr.account_id',
            'WHERE',
            '   wr.state = \'requested\' AND',
            '   a.user_id = $2'
        ].join('\n'),
        values: [+req.params.id, req.user]
    }, function(err, dr) {
        if (err) return next(err)

        if (!dr.rowCount) {
            return res.send(404, {
                name: 'WithdrawRequestNotFound',
                message: 'The withdraw request was not found, ' +
                    'does not belong to the user, or is already processing/processed'
            })
        }

        req.app.activity(req.user, 'CancelWithdrawRequest', { id: +req.params.id })

        res.send(204)
    })
}
