var bankaccounts = module.exports = {}

bankaccounts.configure = function(app, conn, auth) {
    app.get('/admin/bankaccounts', auth, bankaccounts.index.bind(bankaccounts, conn))
}

bankaccounts.index = function(conn, req, res, next) {
    var query = 'SELECT * FROM bank_account WHERE verify_started_at IS NULL'
    conn.read.query(query, function(err, dr) {
        if (err) return next(err)
        res.send(dr.rows)
    })
}
