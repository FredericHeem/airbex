module.exports = exports = function(app) {
    app.get('/admin/balances', app.auth.admin, exports.summary)
}

exports.summary = function(req, res, next) {
    req.app.conn.read.query([
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
