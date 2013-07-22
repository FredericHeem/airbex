module.exports = exports = function(app) {
    app.get('/admin/bankaccounts', app.auth.admin, exports.index)
}

exports.index = function(req, res, next) {
    var query = [
        'SELECT ba.*, u.first_name, u.last_name, u.email',
        'FROM bank_account ba',
        'INNER JOIN "user" u ON u.user_id = ba.user_id',
        'WHERE verify_started_at IS NULL'
    ].join('\n')

    req.app.conn.read.query(query, function(err, dr) {
        if (err) return next(err)
        res.send(dr.rows)
    })
}
