module.exports = exports = function(app) {
    app.get('/v1/currencies', exports.currencies)
}

exports.currencies = function(req, res, next) {
    var query = [
        'SELECT currency_id id, scale',
        'FROM "currency" ORDER BY currency_id'
    ].join('\n')

    req.app.conn.read.query(query, function(err, dr) {
        if (err) return next(err)
        res.send(dr.rows)
    })
}
