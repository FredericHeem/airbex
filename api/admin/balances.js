var Q = require('q')
, num = require('num')
, Balances = module.exports = {}

Balances.configure = function(app, conn, auth) {
    app.get('/admin/balances', auth, Balances.summary.bind(Balances, conn))
}

Balances.summary = function(conn, req, res, next) {
    conn.read.query([
        'SELECT a.currency_id AS currency, a.type, SUM(a.balance / 10^c.scale) balance',
        'FROM account a',
        'INNER JOIN "currency" c ON a.currency_id = c.currency_id',
        'GROUP BY a.currency_id, a.type',
        'ORDER BY type, currency'
    ].join('\n'), function(err, dr) {
        if (err) return next(err)
        res.send(dr.rows)
    })
}
