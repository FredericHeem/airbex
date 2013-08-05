module.exports = exports = function(app) {
    app.get('/v1/balances', app.auth.any, exports.index)
}

exports.index = function(req, res, next) {
    req.app.conn.read.query({
        text: [
            'SELECT currency_id, SUM(available) available, SUM("hold") "hold", SUM(balance) balance',
            'FROM account_view',
            'WHERE user_id = $1',
            'GROUP BY user_id, currency_id'
        ].join('\n'),
        values: [req.user]
    }, function(err, dr) {
        if (err) return next(err)
        res.send(dr.rows.map(function(row) {
            return {
                currency: row.currency_id,
                balance: req.app.cache.formatCurrency(row.balance, row.currency_id),
                hold: req.app.cache.formatCurrency(row.hold, row.currency_id),
                available: req.app.cache.formatCurrency(row.available, row.currency_id)
            }
        }))
    })
}
