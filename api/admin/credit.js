var activities = require('../v1/activities')

module.exports = exports = function(app, conn, auth) {
    app.post('/admin/bankCredit', auth, exports.bankCredit.bind(exports, conn))
}

exports.bankCredit = function(conn, req, res, next) {
    var query = {
        text: [
            'SELECT bank_credit($1, $2, $3, $4) tid',
            'FROM currency',
            'WHERE currency_id = $2'
        ].join('\n'),
        values: [
            req.body.user_id,
            req.body.currency_id,
            req.app.cache.parseCurrency(req.body.amount, req.body.currency_id),
            req.body.reference
        ]
    }

    conn.write.query(query, function(err, dr) {
        if (err) return next(err)
        if (!dr.rowCount) {
            return next(new Error('currency not found ' + req.body.currency_id))
        }

        // Log for admin
        activities.log(conn, req.user, 'AdminBankAccountCredit', req.body)

        // Log for user
        activities.log(conn, req.body.user_id, 'BankCredit', {
            currency: req.body.currency_id,
            amount: req.body.amount,
            reference: req.body.reference
        })
        res.send(201, { transaction_id: dr.rows[0].tid })
    })
}
