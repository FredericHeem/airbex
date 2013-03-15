var Q = require('q')
, orders = module.exports = {}

orders.configure = function(app, conn) {
    app.del('/private/orders/:id', orders.cancel.bind(orders, conn))
    app.post('/private/orders', orders.create.bind(orders, conn))
    app.get('/private/orders', orders.forUser.bind(orders, conn))
}

orders.create = function(conn, req, res, next) {
    var query = conn.build.insert('"order"', {
        user_id: req.security.userId,
        book_id: req.body.bookId,
        price: req.body.price,
        volume: req.body.volume,
        side: req.body.side
    }, 'order_id')

    Q.ninvoke(conn, 'query', query)
    .then(function(cres) {
        res.send(201, { order_id: cres.rows[0].order_id })
    }, next)
    .done()
}

orders.forUser = function(conn, req, res, next) {
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
