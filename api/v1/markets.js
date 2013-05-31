var _ = require('lodash')
, Q = require('q')
, Markets = module.exports = {}

Markets.configure = function(app, conn) {
    app.get('/v1/markets', Markets.markets.bind(Markets, conn))
    app.get('/v1/markets/:id/depth', Markets.depth.bind(Markets, conn))
}

Markets.markets = function(conn, req, res, next) {
    function formatPriceOrNull(m, p) {
        if (p === null) return null
        return req.app.cache.formatOrderPrice(m, p)
    }

    Q.ninvoke(conn.read, 'query', 'SELECT * FROM market_summary_view')
    .then(function(cres) {
        res.send(cres.rows.map(function(row) {
            var m = row.base_currency_id + row.quote_currency_id
            return {
                id: m,
                last: formatPriceOrNull(row.last, m),
                high: formatPriceOrNull(row.high, m),
                low: formatPriceOrNull(row.low, m),
                bid: formatPriceOrNull(row.bid, m),
                ask: formatPriceOrNull(row.ask, m),
                volume: req.app.cache.formatOrderVolume(row.volume, m)
            }
        }))
    }, next)
    .done()
}

Markets.depth = function(conn, req, res, next) {
    var query = [
        'SELECT price, volume, side "type"',
        'FROM order_depth_view odv',
        'INNER JOIN market m ON m.market_id = odv.market_id',
        'WHERE m.base_currency_id || m.quote_currency_id = $1',
        'ORDER BY price'
    ].join('\n')

    Q.ninvoke(conn.read, 'query', {
        text: query,
        values: [req.params.id]
    })
    .then(function(dres) {
        return res.send({
            bids: dres.rows.filter(function(row) {
                return row.type == 0
            }).map(function(row) {
                return [
                    req.app.cache.formatOrderPrice(row.price, req.params.id),
                    req.app.cache.formatOrderVolume(row.volume, req.params.id)
                ]
            }),

            asks: dres.rows.filter(function(row) {
                return row.type == 1
            }).map(function(row) {
                return [
                    req.app.cache.formatOrderPrice(row.price, req.params.id),
                    req.app.cache.formatOrderVolume(row.volume, req.params.id)
                ]
            })
        })
    }, next)
    .done()
}
