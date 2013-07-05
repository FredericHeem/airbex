var Q = require('q')
, orders = module.exports = {}
, validate = require('./validate')
, activities = require('./activities')

orders.configure = function(app, conn, auth) {
    app.del('/v1/orders/:id', auth, orders.cancel.bind(orders, conn))
    app.post('/v1/orders', auth, orders.create.bind(orders, conn))
    app.get('/v1/orders', auth, orders.forUser.bind(orders, conn))
    app.get('/v1/orders/history', auth, orders.history.bind(orders, conn))
}

orders.create = function(conn, req, res, next) {
    if (!validate(req.body, 'order_create', res)) return

    if (!req.apiKey.canTrade) {
        return res.send(401, {
            name: 'MissingApiKeyPermission',
            message: 'Must have trade permission'
        })
    }

    var method = req.body.aon ? 'create_order_aon' : 'create_order'

    var query = {
        text: [
            'SELECT ' + method + '($1, m.market_id, $3, $4, $5) oid',
            'FROM market m',
            'WHERE m.base_currency_id || m.quote_currency_id = $2'
        ].join('\n'),
        values: [
            req.user,
            req.body.market,
            req.body.type == 'bid' ? 0 : 1,
            req.body.price,
            req.body.amount
        ]
    }

    conn.write.query(query, function(err, dr) {
        if (err) {
            if (err.message.match(/transaction_amount_check/)) {
                return res.send(400, {
                    name: 'InvalidAmount',
                    message: 'The requested transfer amount is invalid/out of range'
                })
            }

            if (err.message.match(/non_negative_available/)) {
                return res.send(400, {
                    name: 'InsufficientFunds',
                    message: 'insufficient funds'
                })
            }

            if (/^price.*has too high accuracy$/.test(err.message)) {
                return res.send(400, {
                    name: 'TooHighPriceAccuracy',
                    message: 'Too many decimal places in price ' + req.body.price
                })
            }

            if (/^volume.*has too high accuracy$/.test(err.message)) {
                return res.send(400, {
                    name: 'TooHighVolumeAccuracy',
                    message: 'Too many decimal places in amount ' + req.body.amount
                })
            }

            return next(err)
        }

        var row = dr.rows[0]

        if (!row) {
            return res.send(404, {
                name: 'MarketNotFound',
                message: 'Market not found'
            })
        }

        if (row.oid === null) {
            return res.send(409, {
                name: 'FailedToMatchEntireOrder',
                message: 'Failed to match entire all-or-nothing order'
            })
        }

        activities.log(conn, req.user, 'CreateOrder', {
            market: req.body.market,
            type: req.body.type,
            price: req.body.price,
            amount: req.body.amount,
            address: req.body.address,
            aon: req.body.aon || false
        })

        res.send(201, { id: row.oid })
    })
}

function formatOrderRow(cache, row) {
    return {
        id: row.order_id,
        type: row.side ? 'ask' : 'bid',
        price: cache.formatOrderPrice(row.price, row.market),
        remaining: cache.formatOrderVolume(row.volume, row.market),
        amount: cache.formatOrderVolume(row.original, row.market),
        matched: cache.formatOrderVolume(row.matched, row.market),
        cancelled: cache.formatOrderVolume(row.cancelled, row.market),
        market: row.market
    }
}

orders.forUser = function(conn, req, res, next) {
    Q.ninvoke(conn.read, 'query', {
        text: [
            'SELECT order_id, base_currency_id || quote_currency_id market,',
            '   side, price, volume,',
            '   original, matched, cancelled',
            'FROM order_view o',
            'INNER JOIN market m ON m.market_id = o.market_id',
            'WHERE user_id = $1 AND volume > 0',
            'ORDER BY order_id DESC'
        ].join('\n'),
        values: [req.user]
    })
    .then(function(r) {
        res.send(r.rows.map(formatOrderRow.bind(this, req.app.cache)))
    }, next)
    .done()
}

orders.history = function(conn, req, res, next) {
    Q.ninvoke(conn.read, 'query', {
        text: [
            'SELECT order_id, market, side, volume, matched, cancelled,',
            '   original, price, average_price',
            'FROM order_history o',
            'INNER JOIN market m ON m.market_id = o.market_id',
            'WHERE user_id = $1 AND matched > 0',
            'ORDER BY order_id DESC',
            'LIMIT 100'
        ].join('\n'),
        values: [req.user]
    })
    .then(function(r) {
        res.send(r.rows.map(function(row) {
            var result = formatOrderRow(req.app.cache, row)

            result.averagePrice = req.app.cache.formatOrderPrice(row.average_price,
                row.market)

            return result
        }))
    }, next)
    .done()
}

orders.cancel = function(conn, req, res, next) {
    if (!req.apiKey.canTrade) {
        return res.send(401, {
            name: 'MissingApiKeyPermission',
            message: 'Must have trade permission'
        })
    }

    var q = [
        'UPDATE "order"',
        'SET',
        '   cancelled = volume,',
        '   volume = 0',
        'WHERE',
        '   order_id = $1 AND',
        '   user_id = $2 AND volume > 0'
    ].join('\n')

    Q.ninvoke(conn.write, 'query', {
        text: q,
        values: [+req.params.id, req.user]
    })
    .get('rowCount')
    .then(function(cancelled) {
        if (!cancelled) return res.send(404)
        res.send(204)
        activities.log(conn, req.user, 'CancelOrder', { id: +req.params.id })
    }, next)
    .done()
}
