module.exports = exports = function(app) {
    app.get('/v1/markets', exports.index)
    app.get('/v1/markets/:id/depth', exports.depth)
}

exports.index = function(req, res, next) {
    function formatPriceOrNull(m, p) {
        if (p === null) return null
        return req.app.cache.formatOrderPrice(m, p)
    }

    var query = 'SELECT * FROM market_summary_view'
    req.app.conn.read.query(query, function(err, dr) {
        if (err) return next(err)
        res.send(dr.rows.map(function(row) {
            var m = row.base_currency_id + row.quote_currency_id
            return {
                id: m,
                last: formatPriceOrNull(row.last, m),
                high: formatPriceOrNull(row.high, m),
                low: formatPriceOrNull(row.low, m),
                bid: formatPriceOrNull(row.bid, m),
                ask: formatPriceOrNull(row.ask, m),
                volume: req.app.cache.formatOrderVolume(row.volume, m),
                scale: req.app.cache[m]
            }
        }))
    })
}

exports.depth = function(req, res, next) {
    req.app.conn.read.query({
        text: [
            'SELECT price, volume, "type"',
            'FROM order_depth_view odv',
            'INNER JOIN market m ON m.market_id = odv.market_id',
            'WHERE m.base_currency_id || m.quote_currency_id = $1',
            'ORDER BY CASE WHEN type = \'ask\' THEN price ELSE -price END'
        ].join('\n'),
        values: [req.params.id]
    }, function(err, dr) {
        if (err) return next(err)

        res.send({
            bids: dr.rows.filter(function(row) {
                return row.type == 'bid'
            }).map(function(row) {
                return [
                    req.app.cache.formatOrderPrice(row.price, req.params.id),
                    req.app.cache.formatOrderVolume(row.volume, req.params.id)
                ]
            }),

            asks: dr.rows.filter(function(row) {
                return row.type == 'ask'
            }).map(function(row) {
                return [
                    req.app.cache.formatOrderPrice(row.price, req.params.id),
                    req.app.cache.formatOrderVolume(row.volume, req.params.id)
                ]
            })
        })
    })
}
