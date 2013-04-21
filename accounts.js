var Q = require('q')
, Accounts = module.exports = {}

Accounts.configure = function(app, conn) {
    app.get('/accounts', Accounts.forUser.bind(Accounts, conn))
}

Accounts.forUser = function(conn, req, res, next) {
    Q.ninvoke(conn, 'query', {
        text: 'SELECT account_id, security_id, type, balance, balance_decimal, hold, hold_decimal, available, available_decimal, user_id FROM account_view WHERE user_id = $1',
        values: [req.security.userId]
    })
    .get('rows')
    .then(function(accounts) {
        res.send(accounts)
    }, next)
    .done()
}
