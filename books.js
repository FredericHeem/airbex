var _ = require('underscore')
, Q = require('q')
, Books = module.exports = {}

Books.configure = function(app, conn) {
    app.get('/books', Books.books.bind(Books, conn))
    app.get('/books/:id/depth', Books.depth.bind(Books, conn))
}

Books.books = function(conn, req, res, next) {
    Q.ninvoke(conn, 'query', 'SELECT * FROM books_overview')
    .then(function(cres) {
        res.send(cres.rows.map(function(row) {
            var depth = [];

            if (row.bid_price) {
                depth.push({
                    price: row.bid_price,
                    volume: row.bid_volume,
                    side: 0
                })
            }

            if (row.ask_price) {
                depth.push({
                    price: row.ask_price,
                    volume: row.ask_volume,
                    side: 1
                })
            }

            return {
                book_id: row.book_id,
                pair: row.base_security_id + '/' + row.quote_security_id,
                base_security_id: row.base_security_id,
                quote_security_id: row.quote_security_id,
                depth: depth,
                scale: row.scale,
                last_price: row.last_price,
                high_price: row.high_price,
                low_price: row.low_price,
                volume: row.volume
            }
        }))
    }, next)
    .done()
}

Books.depth = function(conn, req, res, next) {
    var query = 'SELECT price, volume, side, book_id FROM order_depth WHERE book_id = $1'
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
