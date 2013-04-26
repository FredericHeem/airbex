var Q = require('q')
, Accounts = module.exports = {}
, auth = require('./auth')

Accounts.configure = function(app, conn) {
    app.get('/accounts', Accounts.forUser.bind(Accounts, conn))
}

Accounts.forUser = function(conn, req, res, next) {
    if (!auth.demand(req, res)) return

    Q.ninvoke(conn, 'query', {
        text: [
            'SELECT account_id, security_id, type, balance_decimal balance,',
            'hold_decimal "hold", available_decimal available',
            'FROM account_view WHERE user_id = $1'
        ].join('\n'),
        values: [req.security.userId]
    })
    .get('rows')
    .then(function(accounts) {
        res.send(accounts)
    }, next)
    .done()
}
