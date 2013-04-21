var Q = require('q')
, _ = require('underscore')
, auth = require('./auth')
, orders = module.exports = {}
, validate = require('./validate')

orders.configure = function(app, conn) {
    app.del('/orders/:id', orders.cancel.bind(orders, conn))
    app.post('/orders', orders.create.bind(orders, conn))
    app.get('/orders', orders.forUser.bind(orders, conn))
}

orders.create = function(conn, req, res, next) {
    if (!auth.demand(req, res)) return
    if (!validate(req.body, 'order_create', res)) return

    var query = conn.build.insert('"order"', {
        user_id: req.security.userId,
        book_id: req.body.book_id,
        price: req.body.price,
        volume: req.body.volume,
        side: req.body.side
    }, 'order_id')

    Q.ninvoke(conn, 'query', query)
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
    if (!auth.demand(req, res)) return

    // TODO: extract view(s)
    var query =
        ['SELECT o.order_id, o.book_id, b.base_security_id, b.quote_security_id, o.volume, o.price, o.side',
        ', b.base_security_id || b.quote_security_id pair, o.original, o.cancelled, o.matched ',
        'FROM "order" o INNER JOIN book b ON o.book_id = b.book_id ',
        'WHERE user_id = $1 AND o.volume > 0'].join('')

    Q.ninvoke(conn, 'query', {
        text: query,
        values: [req.security.userId]
    })
    .then(function(r) {
        res.send(r.rows)
    }, next)
    .done()
}

orders.cancel = function(conn, req, res, next) {
    if (!auth.demand(req, res)) return

    var q = 'UPDATE "order" SET cancelled = volume, volume = 0 WHERE order_id = $1 AND user_id = $2 AND volume > 0'
    Q.ninvoke(conn, 'query', {
        text: q,
        values: [+req.params.id, req.security.userId]
    })
    .get('rowCount')
    .then(function(cancelled) {
        if (!cancelled) return res.send(404);
        res.send(204);
    }, next)
    .done()
}
