var _ = require('underscore')
, Q = require('q')
, Markets = module.exports = {}

Markets.configure = function(app, conn) {
    app.get('/markets', Markets.markets.bind(Markets, conn))
    app.get('/markets/:id/depth', Markets.depth.bind(Markets, conn))
}

Markets.markets = function(conn, req, res, next) {
    Q.ninvoke(conn, 'query', 'SELECT * FROM market_summary_view')
    .then(function(cres) {
        res.send(cres.rows.map(function(row) {
            return {
                id: row.base_currency_id + row.quote_currency_id,
                last: row.last_decimal,
                high: row.high_decimal,
                low: row.low_decimal,
                scale: row.scale,
                volume: row.volume_decimal,
                bid: row.bid_decimal,
                ask: row.ask_decimal
            }
        }))
    }, next)
    .done()
}

Markets.depth = function(conn, req, res, next) {
    var query = [
        'SELECT price_decimal price, volume_decimal volume, side',
        'FROM order_depth_view odv',
        'INNER JOIN market m ON m.market_id = odv.market_id',
        'WHERE m.base_currency_id || m.quote_currency_id = $1',
        'ORDER BY price_decimal'
    ].join('\n')

    Q.ninvoke(conn, 'query', {
        text: query,
        values: [req.params.id]
    })
    .then(function(cres) {
        return cres.rows.map(function(row) {
            row.side = row.side ? 'ask' : 'bid'
            return row
        })
    }, next)
    .then(function(depth) {
        res.send(depth)
    })
    .done()
}
