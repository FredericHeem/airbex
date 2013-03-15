var Q = require('q')
, transactions = module.exports = {}

transactions.configure = function(app, conn, securityId) {
    //app.post('/private/transactions', transactions.create.bind(transactions, conn))
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
