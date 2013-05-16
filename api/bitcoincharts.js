var _ = require('underscore')
, Q = require('q')
, bitcoincharts = module.exports = {}

bitcoincharts.configure = function(app, conn) {
    app.get('/bitcoincharts/:currencyId/trades.json', bitcoincharts.trades.bind(bitcoincharts, conn))
    app.get('/bitcoincharts/:currencyId/orderbook.json', bitcoincharts.orderbook.bind(bitcoincharts, conn))
}

bitcoincharts.trades = function(conn, req, res, next) {
    var since = req.query.since || 0
    Q.ninvoke(conn.read, 'query', {
        text:
            'SELECT ' +
            'price_decimal::varchar price, ' +
            'volume_decimal::varchar amount, ' +
            'extract(epoch from om.created)::int date, ' +
            'match_id tid ' +
            'FROM match_view om ' +
            'INNER JOIN "order" bo ON bo.order_id = om.bid_order_id ' +
            'INNER JOIN market m ON m.market_id = bo.market_id ' +
            'INNER JOIN "currency" bs ON m.base_currency_id = bs.currency_id ' +
            'WHERE m.quote_currency_id = $1 AND om.match_id > $2 ' +
            'ORDER BY om.match_id ASC;',
        values: [req.params.currencyId, since]
    })
    .then(function(cres) {
        res.send(cres.rows)
    }, next)
    .done()
}

bitcoincharts.orderbook = function(conn, req, res, next) {
   Q.ninvoke(conn.read, 'query', {
        text: [
            'SELECT *',
            'FROM order_depth_view od',
            'INNER JOIN market m ON m.market_id = od.market_id',
            'WHERE m.base_currency_id = \'BTC\' AND m.quote_currency_id = $1'
        ].join('\n'),
        values: [req.params.currencyId]
    })
    .then(function(dres) {
        return res.send({
            asks: dres.rows.filter(function(r) {
                return r.side === 1
            }).map(function(r) {
                return [r.price_decimal, r.volume_decimal]
            }),
            bids: dres.rows.filter(function(r) {
                return r.side === 0
            }).map(function(r) {
                return [r.price_decimal, r.volume_decimal]
            })
        })
    }, next)
    .done()
}
