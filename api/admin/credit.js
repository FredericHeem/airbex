var credit = module.exports = {}
, activities = require('../v1/activities')

credit.configure = function(app, conn, auth) {
    app.post('/admin/bankCredit', auth, credit.bankCredit.bind(credit, conn))
}

credit.bankCredit = function(conn, req, res, next) {
    // conversion from string to properly scaled bigint is performed
    // in the actual query
    conn.write.query({
        text: [
            'SELECT bank_credit($1, $2, ($3::numeric * 10^scale)::bigint, $4, $5) transaction_id',
            'FROM currency',
            'WHERE currency_id = $2'
        ].join('\n'),
        values: [
            req.body.user_id,
            req.body.currency_id,
            req.body.amount,
            req.body.bank_account_id,
            req.body.reference
        ]
    }, function(err, dr) {
        if (err) return next(err)
        if (!dr.rowCount) return next(new Error('currency not found ' + req.body.currency_id))
        activities.log(conn, req.user, 'AdminBankAccountCredit', req.body)
        res.send(201, { transaction_id: dr.rows[0].transaction_id })
    })
}
