module.exports = exports = function(app, conn) {
    app.get('/v1/currencies', exports.currencies.bind(exports, conn))
}

exports.currencies = function(conn, req, res, next) {
    var query = [
        'SELECT currency_id id, scale',
        'FROM "currency" ORDER BY currency_id'
    ].join('\n')

    conn.read.query(query, function(err, dr) {
        if (err) return next(err)
        res.send(dr.rows)
    })
}
