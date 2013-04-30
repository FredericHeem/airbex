var Q = require('q')
, _ = require('underscore')
, orders = module.exports = {}
, validate = require('./validate')
, activities = require('./activities')

orders.configure = function(app, conn, auth) {
    app.del('/orders/:id', auth, orders.cancel.bind(orders, conn))
    app.post('/orders', auth, orders.create.bind(orders, conn))
    app.get('/orders', auth, orders.forUser.bind(orders, conn))
}

orders.create = function(conn, req, res, next) {
    if (!validate(req.body, 'order_create', res)) return

    Q.ninvoke(conn, 'query', {
        text: [
            'SELECT create_order($1, m.market_id, $3, $4, $5) order_id',
            'FROM market m',
            'WHERE m.base_currency_id || m.quote_currency_id = $2',
        ].join('\n'),
        values: [
            req.user,
            req.body.market,
            req.body.side == 'bid' ? 0 : 1,
            req.body.price,
            req.body.volume
        ]
    })
    .then(function(dres) {
        activities.log(conn, req.user, 'CreateOrder', {
            market: req.body.market,
            side: req.body.side,
            price: req.body.price,
            volume: req.body.volume,
            address: req.body.address
        })
        res.send(201, { id: dres.rows[0].order_id })
    }, function(err) {
        if (err.message == 'new row for relation "transaction" violates check constraint "transaction_amount_check"') {
            return res.send(400, {
                name: 'InvalidAmount',
                message: 'The requested transfer amount is invalid/out of range'
            })
        }

        if (err.message == 'new row for relation "account" violates check constraint "non_negative_available"') {
            return res.send(400, {
                name: 'InsufficientFunds',
                message: 'insufficient funds'
            })
        }

        return next(err)
    })
    .done()
}

orders.forUser = function(conn, req, res, next) {
    Q.ninvoke(conn, 'query', {
        text: [
            'SELECT order_id id, base_currency_id || quote_currency_id market, side, price_decimal price, volume_decimal volume,',
            '   original_decimal original',
            'FROM order_view o',
            'INNER JOIN market m ON m.market_id = o.market_id',
            'WHERE user_id = $1 AND volume > 0'
        ].join('\n'),
        values: [req.user]
    })
    .then(function(r) {
        res.send(r.rows.map(function(row) {
            row.side = row.side ? 'ask' : 'bid'
            return row
        }))
    }, next)
    .done()
}

orders.cancel = function(conn, req, res, next) {
    var q = 'UPDATE "order" SET cancelled = volume, volume = 0 WHERE order_id = $1 AND user_id = $2 AND volume > 0'
    Q.ninvoke(conn, 'query', {
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
