var _ = require('underscore')
, Q = require('q')
, bitcoincharts = module.exports = {}

bitcoincharts.configure = function(app, conn) {
    app.get('/bitcoincharts/:securityId/trades.json', bitcoincharts.trades.bind(bitcoincharts, conn))
    app.get('/bitcoincharts/:securityId/orderbook.json', bitcoincharts.orderbook.bind(bitcoincharts, conn))
}

bitcoincharts.trades = function(conn, req, res, next) {
    var since = req.query.since || 0
    Q.ninvoke(conn, 'query', {
        text:
            'SELECT ' +
            '(m.price / 10^b.scale)::varchar price, ' +
            '(m.volume / 10^(bs.scale - b.scale))::varchar amount, ' +
            'extract(epoch from m.created)::int date, ' +
            'match_id tid ' +
            'FROM "match" m ' +
            'INNER JOIN "order" bo ON bo.order_id = m.bid_order_id ' +
            'INNER JOIN "book" b ON b.book_id = bo.book_id ' +
            'INNER JOIN "security" bs ON b.base_security_id = bs.security_id ' +
            'WHERE b.quote_security_id = $1 AND m.match_id > $2 ' +
            'ORDER BY m.match_id ASC;',
        values: [req.params.securityId, since]
    })
    .then(function(cres) {
        res.send(cres.rows)
    }, next)
    .done()
}

bitcoincharts.orderbook = function(conn, req, res, next) {
    var query = 'SELECT price, volume, side, book_id FROM order_depth WHERE book_id = $1'
    Q.ninvoke(conn, 'query', {
        text:
            'SELECT ' +
            '    (price / 10^b.scale)::varchar price, ' +
            '    (volume / 10^(bs.scale - b.scale))::varchar amount, ' +
            '    side ' +
            'FROM order_depth od ' +
            'INNER JOIN book b ON b.book_id = od.book_id ' +
            'INNER JOIN "security" bs ON bs.security_id = b.base_security_id ' +
            'WHERE b.quote_security_id = $1',
        values: [req.params.securityId]
    })
    .then(function(dres) {
        return res.send({
            asks: dres.rows.filter(function(r) {
                return r.side === 1
            }).map(function(r) {
                return [r.price, r.amount]
            }),
            bids: dres.rows.filter(function(r) {
                return r.side === 0
            }).map(function(r) {
                return [r.price, r.amount]
            })
        })
    }, next)
    .done()
}
