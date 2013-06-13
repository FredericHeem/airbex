var bankaccounts = module.exports = {}

bankaccounts.configure = function(app, conn, auth) {
    app.get('/admin/bankaccounts', auth, bankaccounts.index.bind(bankaccounts, conn))
}

bankaccounts.index = function(conn, req, res, next) {
    var query = [
        'SELECT ba.*, u.first_name, u.last_name, u.email',
        'FROM bank_account ba',
        'INNER JOIN "user" u ON u.user_id = ba.user_id',
        'WHERE verify_started_at IS NULL'
    ].join('\n')

    conn.read.query(query, function(err, dr) {
        if (err) return next(err)
        res.send(dr.rows)
    })
}
