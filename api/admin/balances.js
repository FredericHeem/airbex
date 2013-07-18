module.exports = exports = function(app, conn, auth) {
    app.get('/admin/balances', auth, exports.summary.bind(exports, conn))
}

exports.summary = function(conn, req, res, next) {
    conn.read.query([
        'SELECT a.currency_id currency, a.type, SUM(a.balance) balance',
        'FROM account a',
        'INNER JOIN "currency" c ON a.currency_id = c.currency_id',
        'GROUP BY a.currency_id, a.type',
        'ORDER BY type, currency'
    ].join('\n'), function(err, dr) {
        if (err) return next(err)
        res.send(dr.rows.map(function(row) {
            row.balance = req.app.cache.formatCurrency(row.balance, row.currency)
            return row
        }))
    })
}
