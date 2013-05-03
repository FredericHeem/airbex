var Q = require('q')
, num = require('num')
, Balances = module.exports = {}

Balances.configure = function(app, conn, auth) {
    app.get('/balances', auth, Balances.forUser.bind(Balances, conn))
}

Balances.forUser = function(conn, req, res, next) {
    Q.ninvoke(conn, 'query', {
        text: [
            'SELECT currency_id currency, SUM(available) available',
            'FROM account_view',
            'WHERE user_id = $1',
            'GROUP BY user_id, currency_id'
        ].join('\n'),
        values: [req.user]
    })
    .get('rows')
    .then(function(balances) {
        res.send(balances.map(function(balance) {
            balance.available = req.app.cache.formatCurrency(balance.available, balance.currency)
            return balance
        }))
    }, next)
    .done()
}
