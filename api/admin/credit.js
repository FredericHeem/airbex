var credit = module.exports = {}
, activities = require('../v1/activities')
, _ = require('lodash')

credit.configure = function(app, conn, auth) {
    app.post('/admin/bankCredit', auth, credit.bankCredit.bind(credit, conn))
}

credit.bankCredit = function(conn, req, res, next) {
    // conversion from string to properly scaled bigint is performed
    // in the actual query
    var query = {
        text: [
            'SELECT bank_credit($1, $2, ($3::numeric * 10^scale)::bigint, $4) transaction_id',
            'FROM currency',
            'WHERE currency_id = $2'
        ].join('\n'),
        values: [
            req.body.user_id, // 1
            req.body.currency_id, // 2
            req.body.amount, // 3
            req.body.reference // 4
        ]
    }

    conn.write.query(query, function(err, dr) {
        if (err) return next(err)
        if (!dr.rowCount) return next(new Error('currency not found ' + req.body.currency_id))

        // Log for admin
        activities.log(conn, req.user, 'AdminBankAccountCredit', req.body)

        // Log for user
        activities.log(conn, req.body.user_id, 'BankCredit', {
            currency: req.body.currency_id,
            amount: req.body.amount,
            reference: req.body.reference
        })
        res.send(201, { transaction_id: dr.rows[0].transaction_id })
    })
}
