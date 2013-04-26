var _ = require('underscore')
, Q = require('q')
, Books = module.exports = {}

Books.configure = function(app, conn) {
    app.get('/books', Books.books.bind(Books, conn))
    app.get('/books/:id/depth', Books.depth.bind(Books, conn))
}

Books.books = function(conn, req, res, next) {
    Q.ninvoke(conn, 'query', 'SELECT * FROM book_view')
    .then(function(cres) {
        res.send(cres.rows.map(function(row) {
            return {
                book_id: row.book_id,
                pair: row.base_security_id + '/' + row.quote_security_id,
                base_security_id: row.base_security_id,
                quote_security_id: row.quote_security_id,
                last: row.last_decimal,
                high: row.high_decimal,
                low: row.low_decimal,
                scale: row.scale,
                volume: row.volume_decimal,
                bid: row.bid_decimal,
                ask: row.ask_decimal
            }
        }))
    }, next)
    .done()
}

Books.depth = function(conn, req, res, next) {
    var query = [
        'SELECT price_decimal price, volume_decimal volume, side, book_id',
        'FROM order_depth_view WHERE book_id = $1'
    ].join('\n')

    Q.ninvoke(conn, 'query', {
        text: query,
        values: [req.params.id]
    })
    .then(function(cres) {
        if (!+req.query.grouped) {
            return cres.rows
        }
        return {
            bids: _.where(cres.rows, { side: 0 }),
            asks: _.where(cres.rows, { side: 1 })
        }
    }, next)
    .then(function(depth) {
        res.send(depth)
    })
    .done()
}
