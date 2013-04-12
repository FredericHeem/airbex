var Q = require('q')
, transactions = module.exports = {}

transactions.configure = function(app, conn, securityId) {
    app.get('/accounts/transactions', transactions.forUser.bind(transactions, conn))
    app.get('/accounts/:id/transactions', transactions.forUserAccount.bind(transactions, conn))
}

transactions.forUser = function(conn, req, res, next) {
    var query = 'SELECT * FROM account_transaction ' +
        'WHERE user_id = $1'
    Q.ninvoke(conn, 'query', {
        text: query,
        values: [req.security.userId]
    })
    .then(function(dres) {
        res.send(dres.rows)
    }, next)
    .done()
}

transactions.forUserAccount = function(conn, req, res, next) {
    var query = 'SELECT * FROM account_transaction ' +
        'WHERE account_id = $1 AND user_id = $2'
    Q.ninvoke(conn, 'query', {
        text: query,
        values: [req.params.id, req.security.userId]
    })
    .then(function(dres) {
        res.send(dres.rows)
    }, next)
    .done()
}
