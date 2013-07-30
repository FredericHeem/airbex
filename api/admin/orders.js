module.exports = exports = function(app) {
    app.get('/admin/orders', app.auth.admin, function(req, res, next) {
        exports.query(req.app, req.query, function(err, items) {
            if (err) return next(err)
            res.send(items)
        })
    })
}

exports.query = function(app, query, cb) {
    var criteria = []

    if (query.user) {
        criteria.push(['u.user_id', query.user])
    }

    if (query.active) {
        criteria.push('remaining > 0')
    }

    var text = [
        'SELECT o.*,',
        'm.base_currency_id || m.quote_currency_id market,',
        'u.email_lower',
        'FROM "order" o',
        'INNER JOIN market m ON m.market_id = o.market_id',
        'INNER JOIN "user" u ON u.user_id = o.user_id'
    ]
    , values = []

    if (criteria.length) {
        text.push('WHERE')
        criteria.forEach(function(x) {
            if (typeof x == 'string') return text.push(x)
            values.push(x[1])
            text.push(x[0] + ' = $' + values.length)
        })
    }

    app.conn.read.query({
        text: text.join('\n'),
        values: values
    }, function(err, dr) {
        if (err) return cb(err)
        cb(null, dr.rows.map(function(row) {
            return {
                id: row.order_id,
                market: row.market,
                price: app.cache.formatOrderPrice(row.price, row.market),
                original: app.cache.formatOrderVolume(row.original, row.market),
                matched: app.cache.formatOrderVolume(row.matched, row.market),
                cancelled: app.cache.formatOrderVolume(row.cancelled, row.market),
                remaining: app.cache.formatOrderVolume(row.remaining, row.market),
                userEmail: row.email_lower,
                created: row.created_at,
                type: row.type
            }
        }))
    })
}
