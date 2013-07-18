var validate = require('./validate')
, debug = require('debug')('snow:orders')

module.exports = exports = function(app) {
    app.del('/v1/orders/:id', app.auth.primary, exports.cancel)
    app.post('/v1/orders', app.auth.primary, exports.create)
    app.get('/v1/orders', app.auth.any, exports.index)
    app.get('/v1/orders/history', app.auth.any, exports.history)
}

exports.create = function(req, res, next) {
    if (!validate(req.body, 'order_create', res)) return

    if (req.body.price && !req.body.price.match(/^\d+(\.\d+)?$/)) {
        res.send({
            name: 'BadRequest',
            message: 'Price is invalid'
        })
    }

    if (!req.apiKey.canTrade) {
        return res.send(401, {
            name: 'MissingApiKeyPermission',
            message: 'Must have trade permission'
        })
    }

    var marketId = req.app.cache.markets[req.body.market].id
    , price = null
    , amount = req.app.cache.parseOrderVolume(req.body.amount, req.body.market)
    , query

    if (req.body.price) {
        price = req.app.cache.parseOrderPrice(req.body.price, req.body.market)
    }

    debug('price %s --> %s', req.body.price, price)

    if (req.body.aon) {
        query = {
            text: [
                'SELECT create_order_aon($1, $2, $3, $4, $5) oid'
            ].join('\n'),
            values: [
                req.user,
                marketId,
                req.body.type == 'bid' ? 0 : 1,
                price,
                amount
            ]
        }
    } else {
        query = {
            text: [
                'INSERT INTO "order" (user_id, market_id, side, price, volume)',
                'VALUES ($1, $2, $3, $4, $5)',
                'RETURNING order_id oid'
            ].join('\n'),
            values: [
                req.user,
                marketId,
                req.body.type == 'bid' ? 0 : 1,
                price,
                amount
            ]
        }
    }

    req.app.conn.write.query(query, function(err, dr) {
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

        req.app.activity(req.user, 'CreateOrder', {
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

exports.index = function(req, res, next) {
    req.app.conn.read.query({
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
    }, function(err, dr) {
        if (err) return next(err)
        res.send(dr.rows.map(formatOrderRow.bind(this, req.app.cache)))
    })
}

exports.history = function(req, res, next) {
    req.app.conn.read.query({
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

exports.cancel = function(req, res, next) {
    req.app.conn.write.query({
        text: [
            'UPDATE "order"',
            'SET',
            '   cancelled = volume,',
            '   volume = 0',
            'WHERE',
            '   order_id = $1 AND',
            '   user_id = $2 AND volume > 0'
        ].join('\n'),
        values: [+req.params.id, req.user]
    }, function(err, dr) {
        if (err) return next(err)
        if (!dr.rowCount) return res.send(404)
        res.send(204)
        req.app.activity(req.user, 'CancelOrder', { id: +req.params.id })
    })
}
