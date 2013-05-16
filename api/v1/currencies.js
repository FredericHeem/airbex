var currencies = module.exports = {}

currencies.configure = function(app, conn) {
    app.get('/v1/currencies', currencies.currencies.bind(currencies, conn))
}

currencies.currencies = function(conn, req, res, next) {
    var query =
        'SELECT currency_id id, scale \
        FROM "currency" ORDER BY currency_id'

    conn.read.query(query, function(err, dr) {
        if (err) return next(err)
        res.send(dr.rows)
    })
}
