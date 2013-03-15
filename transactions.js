var Q = require('q')
, transactions = module.exports = {}

transactions.configure = function(app, conn, securityId) {
    app.get('/accounts/transactions', transactions.forUser.bind(transactions, conn))
    app.get('/accounts/:id/transactions', transactions.forUserAccount.bind(transactions, conn))
}

transactions.forUser = function(conn, req, res, next) {
    var query = 'SELECT * FROM account_transactions ' +
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
    var query = 'SELECT * FROM account_transactions ' +
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

transactions.create = function(conn, req, res, next) {
    throw new Error('TODO: db function to verify debit/credit accounts')

    var query = conn.build.insert('transaction', {
        debit_account_id: req.body.debit_account_id,
        credit_account_id: req.body.credit_account_id,
        amount: req.body.amount
    }, 'transaction_id')

    Q.ninvoke(conn, 'query', query)
    .then(function(cres) {
        res.send({ transaction_id: cres.rows[0].transaction_id })
    }, next)
    .done()
}
