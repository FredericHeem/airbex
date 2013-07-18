module.exports = exports = function(app) {
    app.get('/v1/balances', app.userAuth, exports.forUser)
}

exports.forUser = function(req, res, next) {
    req.app.conn.read.query({
        text: [
            'SELECT currency_id currency, SUM(available) available',
            'FROM account_view',
            'WHERE user_id = $1',
            'GROUP BY user_id, currency_id'
        ].join('\n'),
        values: [req.user]
    }, function(err, dr) {
        if (err) return next(err)
        res.send(dr.rows.map(function(balance) {
            balance.available = req.app.cache.formatCurrency(balance.available,
                balance.currency)
            return balance
        }))
    })
}
