var _ = require('underscore');

var self = module.exports = {
    db: require('../db'),

    index: function(cb) {
        var client = self.db();
        client.query({
            text:
                'SELECT * FROM books_overview'
        }, function(err, res) {
            client.end();
            if (err) return cb(err);

            var r = _.map(res.rows, function(row) {
                var depth = [];

                if (row.bid_price) depth.push( { price: row.bid_price, volume: row.bid_volume, side: 0 });
                if (row.ask_price) depth.push({ price: row.ask_price, volume: row.ask_volume, side: 1 });

                return {
                    book_id: row.book_id,
                    pair: row.base_security_id + '/' + row.quote_security_id,
                    base_security_id: row.base_security_id,
                    quote_security_id: row.quote_security_id,
                    depth: depth,
                    scale: row.scale
                };
            });

            cb(null, r);
        });
    },

    depth: function(bookId, grouped, cb) {
        var q = 'SELECT price, volume, side, book_id FROM order_depth WHERE book_id = $1';

        var client = self.db();
        client.query({
            text: q,
            values: [bookId]
        }, function(err, res) {
            client.end();
            if (err) return cb(err);

            if (grouped) {
                var bids = _.where(res.rows, { side: 0 });
                var asks = _.where(res.rows, { side: 1 });
                cb(null, { bids: bids, asks: asks });
            } else {
                cb(null, res.rows);
            }
        });
    },

    configure: function(app) {
        app.get('/public/books', function(req, res, next) {
            self.index(function(err, r) {
                if (err) return next(err);
                res.send(r);
                res.end();
            });
        });

        app.get('/public/books/:id/depth', function(req, res, next) {
            console.log('query', req.query.grouped)
            var grouped = _.has(req.query, 'grouped') ? !!+req.query.grouped : true;
            console.log(grouped)

            self.depth(req.params.id, grouped, function(err, r) {
                if (err) return next(err);
                res.send(r);
                res.end();
            });
        });
    }
};