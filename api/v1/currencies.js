module.exports = exports = function(app) {
    app.get('/v1/currencies', exports.index)
}

exports.index = function(req, res, next) {
    var query = [
        'SELECT currency_id, scale',
        'FROM currency',
        'ORDER BY currency_id'
    ].join('\n')

    req.app.conn.read.query(query, function(err, dr) {
        if (err) return next(err)
        res.send(dr.rows.map(function(row) {
            return {
                id: row.currency_id,
                scale: row.scale
            }
        }))
    })
}
