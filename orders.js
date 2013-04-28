var Q = require('q')
, _ = require('underscore')
, auth = require('./auth')
, orders = module.exports = {}
, validate = require('./validate')

orders.configure = function(app, conn, auth) {
    app.del('/orders/:id', auth, orders.cancel.bind(orders, conn))
    app.post('/orders', auth, orders.create.bind(orders, conn))
    app.get('/orders', auth, orders.forUser.bind(orders, conn))
}

orders.create = function(conn, req, res, next) {
    if (!validate(req.body, 'order_create', res)) return

    Q.ninvoke(conn, 'query', {
        text: 'SELECT create_order($1, $2, $3, $4, $5) order_id',
        values: [req.user, req.body.market_id, req.body.side, req.body.price, req.body.volume]
    })
    .then(function(cres) {
        res.send(201, { order_id: cres.rows[0].order_id })
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
                message: 'Source account cannot fund the transfer'
            })
        }

        return next(err)
    })
    .done()
}

orders.forUser = function(conn, req, res, next) {
    Q.ninvoke(conn, 'query', {
        text: [
            'SELECT order_id id, market_id, side, price_decimal price, volume_decimal volume,',
            '   original_decimal original, matched_decimal matched',
            'FROM order_view',
            'WHERE user_id = $1 AND volume > 0'
        ].join('\n'),
        values: [req.user]
    })
    .then(function(r) {
        res.send(r.rows)
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
        if (!cancelled) return res.send(404);
        res.send(204);
    }, next)
    .done()
}
