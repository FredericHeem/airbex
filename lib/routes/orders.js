var _ = require('underscore')
, async = require('async')
, debug = require('debug')('snow:orders')
, config = require('konfu')

var self = module.exports = {
    db: require('../db'),

    create: function(userId, bookId, side, price, volume, cb) {
        if (volume % 1 !== 0) return cb(new Error('volume has decimals'));
        if (price % 1 !== 0) return cb(new Error('price has decimals'));
        if (volume <= 0) return cb(new Error('volume <= 0'));
        if (price <= 0) return cb(new Error('price <= 0'));
        if (side != 1 && side !== 0) {
            console.error('invalid side', side, typeof side);
            return cb(new Error('side must be 0 or 1'));
        }
        if (!userId) return cb(new Error('userId missing'));
        if (!bookId) return cb(new Error('bookId missing'));

        debug('parameters to create verified');

        var client = self.db(config.pg_url, config.pg_native);

        client.query(self.db.build.insert('"order"', {
            user_id: userId,
            book_id: bookId,
            price: price,
            volume: volume,
            side: side
        }, 'order_id'), function(err, res) {
            if (err) {
                debug('could not create order');
                console.error(err);
            }

            client.end();
            cb(err, err ? null : res.rows[0].order_id);
        });
    },

    forUser: function(userId, cb) {
        var client = self.db(config.pg_url, config.pg_native);
        client.query({
            text:
                ['SELECT o.order_id, o.book_id, b.base_security_id, b.quote_security_id, o.volume, o.price, o.side',
                ', b.base_security_id || b.quote_security_id pair, o.original, o.cancelled, o.matched ',
                'FROM "order" o INNER JOIN book b ON o.book_id = b.book_id ',
                'WHERE user_id = $1 AND o.volume > 0'].join(''),
            values: [userId]
        }, function(err, res) {
            client.end();
            cb(err, err ? null : res.rows);
        });
    },

    configure: function(app) {
        app.post('/private/orders', function(req, res, next) {
            debug('user id at time of order create is ' + req.security.userId);

            self.create(req.security.userId, req.body.book_id, +req.body.side,
                req.body.price, req.body.volume, function(err, id) {
                    if (err) return next(err);
                    res.send({ order_id: id });
                    res.end();
            });
        });

        app.del('/private/orders/:id', function(req, res, next) {
            var userId = req.security.userId;
            var orderId = +req.params.id;

            debug('cancelling ' + orderId + ' for user ' + userId);

            var q = 'UPDATE "order" SET cancelled = volume, volume = 0 WHERE order_id = $1 AND user_id = $2 AND volume > 0';

            debug(q);

            var client = self.db(config.pg_url, config.pg_native);
            client.query({
                text: q,
                values: [orderId, userId]
            }, function(err, dres) {
                client.end();

                if (err) return next(err);

                if (!dres.rowCount) {
                    debug('cancel order failed, not found/already cancelled/no access');
                    console.error(dres);
                    return res.send(404);
                }

                debug('order ' + orderId + ' cancelled');
                res.send(204);
            });
        });

        app.get('/private/orders', function(req, res, next) {
            self.forUser(req.security.userId, function(err, orders) {
                if (err) return next(err);
                debug('sending ' + orders.length + ' orders');
                res.send(orders);
                res.end();
            });
        });
    }
};