module.exports = exports = function(app) {
    app.get('/bitcoincharts/:currencyId/trades.json', exports.trades)
    app.get('/bitcoincharts/:currencyId/orderbook.json', exports.orderbook)
}

exports.trades = function(req, res, next) {
    var since = req.query.since || 0
    req.app.conn.read.query({
        text: [
            'SELECT',
            '   price_decimal::varchar price,',
            '   volume_decimal::varchar amount,',
            '   extract(epoch from om.created)::int date,',
            '   match_id tid',
            'FROM match_view om',
            'INNER JOIN "order" bo ON bo.order_id = om.bid_order_id',
            'INNER JOIN market m ON m.market_id = bo.market_id',
            'WHERE',
            '   m.base_currency_id = \'BTC\' AND',
            '   m.quote_currency_id = $1 AND',
            '   om.match_id > $2',
            'ORDER BY om.match_id ASC'
        ].join('\n'),
        values: [req.params.currencyId, since]
    }, function(err, dr) {
        if (err) return next(err)
        res.send(dr.rows)
    })
}

exports.orderbook = function(req, res, next) {
    req.app.conn.read.query({
        text: [
            'SELECT *',
            'FROM order_depth_view od',
            'INNER JOIN market m ON m.market_id = od.market_id',
            'WHERE',
            '   m.base_currency_id = \'BTC\' AND',
            '   m.quote_currency_id = $1'
        ].join('\n'),
        values: [req.params.currencyId]
    }, function(err, dr) {
        if (err) return next(err)

        res.send({
            bids: dr.rows.filter(function(r) {
                return r.side === 0
            }).map(function(r) {
                return [r.price_decimal, r.volume_decimal]
            }),
            asks: dr.rows.filter(function(r) {
                return r.side === 1
            }).map(function(r) {
                return [r.price_decimal, r.volume_decimal]
            })
        })
    })
}
