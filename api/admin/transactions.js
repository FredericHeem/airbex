var builder = require('pg-builder')

module.exports = exports = function(app) {
    app.post('/admin/transactions', app.security.demand.admin, exports.index)
}

exports.index = function(req, res, next) {
    var q = builder()
    .from('admin_transaction_view')
    .select('transaction_id')
    .select('type')
    .select('currency_id')
    .select('amount')
    .select('debit_user_name')
    .select('credit_user_name')
    .select('debit_user_email')
    .select('credit_user_email')
    .select('debit_user_id')
    .select('credit_user_id')
    .select('debit_account_type')
    .select('credit_account_type')
    .select('created_at')
    .select('COUNT(*) OVER() full_row_count')
    .order('created_at', 'desc')

    if (req.body.skip) {
        q = q.skip(+req.body.skip)
    }

    if (req.body.userId) {
        q = q.w('debit_user_id = ${userId} OR credit_user_id = ${userId}')
        .p('userId', +req.body.userId)
    }

    var limit = Math.min(100, +req.body.limit || 100)

    q = q.limit(limit)

    req.app.conn.read.query(q, function(err, dr) {
        if (err) return next(err)
        res.send(dr.rowCount ? {
            count: dr.rows[0].full_row_count,
            limit: limit,
            transactions: dr.rows.map(function(row) {
                return {
                    id: row.transaction_id,
                    amount: req.app.cache.formatCurrency(row.amount, row.currency_id),
                    currency: row.currency_id,
                    type: row.type,
                    createdAt: new Date(row.created_at).toISOString(),
                    debitUserId: row.debit_user_id,
                    creditUserId: row.credit_user_id,
                    debitUserName: row.debit_user_name,
                    creditUserName: row.credit_user_name,
                    debitUserEmail: row.debit_user_email,
                    creditUserEmail: row.credit_user_email,
                    debitAccountType: row.debit_account_type,
                    creditAccountType: row.credit_account_type
                }
            })
        } : {
            count: 0,
            transactions: []
        })
    })
}
