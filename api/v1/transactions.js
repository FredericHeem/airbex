var builder = require('pg-builder')

module.exports = exports = function(app) {
    app.post('/v1/transactions', app.security.demand.any, exports.index)
    app.get('/v1/transactions/csv', app.security.demand.any, exports.csv)
    exports.app = app
}

exports.index = function(req, res, next) {
    var q = builder()
    .from('user_transaction_view')
    .select('transaction_id')
    .select('type')
    .select('currency_id')
    .select('amount')
    .select('created_at')
    .select('COUNT(*) OVER() full_row_count')
    .order('created_at', 'desc')
    .where('user_id = ${userId}')
    .p('userId', req.user.id)

    if (req.body.skip) {
        q = q.skip(+req.body.skip)
    }

    var limit = Math.min(25, +req.body.limit || 25)
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
                    date: new Date(row.created_at).toISOString()
                }
            })
        } : {
            count: 0,
            transactions: []
        })
    })
}

exports.csv = function(req, res, next) {
    var q = builder()
    .from('user_transaction_view')
    .select('transaction_id')
    .select('type')
    .select('currency_id')
    .select('amount')
    .select('created_at')
    .order('created_at', 'desc')
    .where('user_id = ${userId}')
    .p('userId', req.user.id)

    req.app.conn.read.query(q, function(err, dr) {
        if (err) return next(err)

        var csv = [
            ['id', 'type', 'timestamp', 'date', 'currency', 'amount']
        ]

        csv = csv.concat(dr.rows.map(function(row) {
            return [
                row.transaction_id,
                row.type,
                Math.round(new Date(row.created_at) / 1e3),
                row.created_at.toISOString(),
                row.currency_id,
                req.app.cache.formatCurrency(row.amount, row.currency_id)
            ]
        }))

        res.header('Content-Type', 'text/csv; name="transactions.csv"')
        res.header('Content-Disposition', 'attachment; filename="transactions.csv"')
        res.send(csv.map(function(row) {
            return row.join(',')
        }).join('\n'))
    })
}
