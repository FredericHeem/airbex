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
                market_id: row.market_id,
                pair: row.base_currency_id + '/' + row.quote_currency_id,
                base_currency_id: row.base_currency_id,
                quote_currency_id: row.quote_currency_id,
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
        'SELECT price_decimal price, volume_decimal volume, side, market_id',
        'FROM order_depth_view WHERE market_id = $1'
    ].join('\n')

    Q.ninvoke(conn, 'query', {
        text: query,
        values: [req.params.id]
    })
    .then(function(cres) {
        if (!+req.query.grouped) {
            return cres.rows
        }
        return {
            bids: _.where(cres.rows, { side: 0 }),
            asks: _.where(cres.rows, { side: 1 })
        }
    }, next)
    .then(function(depth) {
        res.send(depth)
    })
    .done()
}
