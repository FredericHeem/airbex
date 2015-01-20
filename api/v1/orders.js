var log = require('../log')(__filename)
, debug = log.debug
, order = require("../order")


module.exports = exports = function(app) {
    app.delete('/v1/orders', app.security.demand.trade, exports.cancelAll)
    app.delete('/v1/orders/:id', app.security.demand.trade, exports.cancel)
    app.post('/v1/orders', app.security.demand.trade(2), exports.create)
    app.get('/v1/orders', app.security.demand.any, exports.index)
    app.get('/v1/orders/history', app.security.demand.any, exports.history)
}

exports.create = function(req, res, next) {
	order.create(req.user.id, req, res, next)
}

function formatOrderRow(cache, row) {
    return {
        id: row.order_id,
        market: row.market,
        type: row.type,
        price: row.price ? cache.formatOrderPrice(row.price, row.market) : null,
        amount: cache.formatOrderVolume(row.original, row.market),
        remaining: cache.formatOrderVolume(row.volume, row.market),
        matched: cache.formatOrderVolume(row.matched, row.market),
        cancelled: cache.formatOrderVolume(row.cancelled, row.market)
    }
}

exports.index = function(req, res, next) {
    req.app.conn.read.get().query({
        text: [
            'SELECT order_id, base_currency_id || quote_currency_id market,',
            '   type, price, volume,',
            '   original, matched, cancelled',
            'FROM order_view o',
            'INNER JOIN market_active_view m ON m.market_id = o.market_id',
            'WHERE user_id = $1 AND volume > 0',
            'ORDER BY order_id DESC'
        ].join('\n'),
        values: [req.user.id]
    }, function(err, dr) {
        if (err) return next(err)
        res.send(dr.rows.map(formatOrderRow.bind(this, req.app.cache)))
    })
}

exports.history = function(req, res, next) {
    req.app.conn.read.get().query({
        text: [
            'SELECT order_id, market, type, volume, matched, cancelled,',
            '   original, price, average_price',
            'FROM order_history o',
            'INNER JOIN market_active_view m ON m.market_id = o.market_id',
            'WHERE user_id = $1 AND matched > 0',
            'ORDER BY order_id DESC',
            'LIMIT 100'
        ].join('\n'),
        values: [req.user.id]
    }, function(err, dr) {
        if (err) return next(err)
        res.send(dr.rows.map(function(row) {
            var result = formatOrderRow(req.app.cache, row)

            result.averagePrice = req.app.cache.formatOrderPrice(row.average_price,
                row.market)

            return result
        }))
    })
}

exports.cancelAll = function(req, res, next) {
    var market = req.body.market;
    debug("cancelAll market:", market);
    req.app.conn.write.get().query({
        text: [
            'UPDATE "order" o',
            'SET',
            '   cancelled = volume,',
            '   volume = 0',
            'FROM market ',
            'WHERE',
            '   o.market_id = market.market_id AND',
            '   market.name = $2 AND',
            '   user_id = $1 AND volume > 0'
        ].join('\n'),
        values: [req.user.id, market]
    }, function(err, dr) {
        if (err) return next(err)
        res.status(204).end()
        //req.app.activity(req.user.id, 'CancelOrderMarket', { market: market })
    })
}

exports.cancel = function(req, res, next) {
    req.app.conn.write.get().query({
        text: [
            'UPDATE "order"',
            'SET',
            '   cancelled = volume,',
            '   volume = 0',
            'WHERE',
            '   order_id = $1 AND',
            '   user_id = $2 AND volume > 0'
        ].join('\n'),
        values: [+req.params.id, req.user.id]
    }, function(err, dr) {
        if (err) return next(err)
        if (!dr.rowCount) {
            return res.status(404).send({
                name: 'OrderNotFound',
                message: 'The specified order does not exist or has been canceled'
            })
        }
        res.status(204).end()
        //req.app.activity(req.user.id, 'CancelOrder', { id: +req.params.id })
    })
}
