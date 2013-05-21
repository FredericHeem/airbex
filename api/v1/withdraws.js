var _ = require('underscore')
, activities = require('./activities')
, validate = require('./validate')
, withdraws = module.exports = {}

withdraws.configure = function(app, conn, auth) {
    app.del('/v1/withdraws/:id', auth, withdraws.cancel.bind(withdraws, conn))
    app.get('/v1/withdraws', auth, withdraws.forUser.bind(withdraws, conn))
    app.post('/v1/withdraws/norway', auth, withdraws.withdrawNorway.bind(withdraws, conn))
}

withdraws.withdrawNorway = function(conn, req, res, next) {
    if (!validate(req.body, 'withdraw_norway', res)) return

    conn.write.query({
        text: [
            'SELECT withdraw_manual($1, $2::numeric * 10^c.scale, $3) id',
            'FROM currency c',
            'WHERE c.currency_id = $1'
        ].join('\n'),
        values: [req.user, req.currency, req.amount]
    }, function(err, dr) {
        if (err) return next(err)

        if (!dr.rowCount) return res.send(400, {
            name: 'CurrencyNotFound',
            message: 'The currency could not be found'
        })

        res.send(204)
    })
}

withdraws.forUser = function(conn, req, res, next) {
    conn.read.query({
        text: 'SELECT * FROM withdraw_request_view WHERE user_id = $1',
        values: [req.user]
    }, function(err, dr) {
        if (err) return next(err)
        res.send(dr.rows.map(function(row) {
            return _.extend({
                currency: row.currency_id,
                amount: req.app.cache.formatCurrency(row.amount, row.currency_id),
                id: row.request_id,
                destination: row.ripple_address || row.litecoin_address || row.bitcoin_address || null
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
