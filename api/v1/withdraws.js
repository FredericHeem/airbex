var _ = require('underscore')
, validate = require('./validate')
, activities = require('./activities')
, withdraws = module.exports = {}

withdraws.configure = function(app, conn, auth) {
    app.del('/v1/withdraws/:id', auth, withdraws.cancel.bind(withdraws, conn))
    app.get('/v1/withdraws', auth, withdraws.forUser.bind(withdraws, conn))
    app.post('/v1/withdraws/norway', auth, withdraws.withdrawNorway.bind(withdraws, conn))
}

withdraws.withdrawNorway = function(conn, req, res, next) {
    if (!validate(req.body, 'withdraw_norway', res)) return

    conn.read.query({
        text: [
            'SELECT ba.account_number',
            'FROM bank_account ba',
            'INNER JOIN "user" u ON u.user_id = ba.user_id',
            'WHERE ba.bank_account_id = $2 AND u.user_id = $1'
        ].join('\n'),
        values: [req.user, req.body.bankAccount]
    }, function(err, dr) {
        if (err) return next(err)

        if (!dr.rowCount) return res.send(404, {
            name: 'BankAccountNotFound',
            message: 'Bank account does not exist or belongs to another user.'
        })

        var account = dr.rows[0].bank_account
        , amount = req.app.cache.parseCurrency(req.body.amount, 'NOK')
        , destination = {
            type: 'NorwayBank',
            account: account
        }

        conn.write.query({
            text: 'SELECT withdraw_manual($1, $2, $3, $4)',
            values: [req.user, 'NOK', amount, destination]
        }, function(err, dr) {
            if (!err) return res.send(204)

            if (err.message.match(/non_negative_available/)) {
                return res.send(500, {
                    name: 'NoFunds',
                    message: 'Insufficient funds.'
                })
            }

            next(err)
        })
    })
}

withdraws.forUser = function(conn, req, res, next) {
    conn.read.query({
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
            } else if (row.method == 'manual'){
                if (row.manual_destination.type == 'NorwayBank') {
                    destination = row.manual_destination.account
                }
            }

            if (!destination) {
                return next(new Error('Unknown destination for ' + JSON.stringify(row)))
            }

            return _.extend({
                currency: row.currency_id,
                amount: req.app.cache.formatCurrency(row.amount, row.currency_id),
                id: row.request_id,
                destination:  destination
            }, _.pick(row, 'created', 'completed', 'method', 'state', 'error'))
        }))
    })
}

withdraws.cancel = function(conn, req, res, next) {
    conn.write.query({
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
        if (!dr.rowCount) return res.send(404, {
            name: 'WithdrawRequestNotFound',
            message: 'The withdraw request was not found, does not belong to the user, or is already processing/processed'
        })
        activities.log(conn, req.user, 'CancelWithdrawRequest', { id: +req.params.id })
        res.send(204)
    })
}
