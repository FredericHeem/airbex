var Q = require('q')
, Accounts = module.exports = {}

Accounts.configure = function(app, conn, auth) {
    app.get('/accounts', auth, Accounts.forUser.bind(Accounts, conn))
}

Accounts.forUser = function(conn, req, res, next) {
    Q.ninvoke(conn, 'query', {
        text: [
            'SELECT account_id, currency_id, type, balance_decimal balance,',
            'hold_decimal "hold", available_decimal available',
            'FROM account_view WHERE user_id = $1'
        ].join('\n'),
        values: [req.user]
    })
    .get('rows')
    .then(function(accounts) {
        res.send(accounts)
    }, next)
    .done()
}
