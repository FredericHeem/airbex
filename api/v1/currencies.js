module.exports = exports = function(app) {
    app.get('/v1/currencies', exports.index)
}

exports.index = function(req, res, next) {
    var query = [
        'SELECT *',
        'FROM currency',
        'ORDER BY currency_id'
    ].join('\n')

    req.app.conn.read.query(query, function(err, dr) {
        if (err) return next(err)
        res.send(dr.rows.map(function(row) {
            return {
                id: row.currency_id,
                fiat: row.fiat,
                scale: row.scale,
                scale_display: row.scale_display,
                name: row.name,
                withdraw_min: req.app.cache.formatCurrency(row.withdraw_min, row.currency_id),
                withdraw_max: req.app.cache.formatCurrency(row.withdraw_max, row.currency_id),
                address_regex: row.address_regex
            }
        }))
    })
}
