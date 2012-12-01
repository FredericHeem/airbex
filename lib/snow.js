var _ = require('underscore')
, debug = require('debug')('snow')
, async = require('async')
, request = require('request')
, crypto = require('crypto')
, qs = require('querystring')
, num = require('num')

var Snow = module.exports = function(options) {
    this.options = options || {};
    _.defaults(this.options, {
        url: 'https://api.snowco.in'
    })

    this.nonce = require('nonce')();
};

_.extend(Snow.prototype, {
    send: function(method, url, req, cb) {
        if (_.isFunction(req)) {
            cb = req;
            req = {};
        }

        var nonce = this.nonce();

        var body = qs.stringify(req)
        debug('body ' + body)
        var sec_key_buffer = Buffer(this.options.secret, 'base64');
        var hmac = crypto.createHmac('sha512', sec_key_buffer);
        hmac.update(body);
        hmac.update('' + nonce);
        var sign = hmac.digest('base64');

        debug(method + ' ' + this.options.url + url);

        request({
            url: this.options.url + url,
            method: method,
            json: true,
            headers: {
                'snow-version': 1,
                'snow-nonce': nonce,
                'snow-key': this.options.key,
                'snow-sign': sign,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body
        }, function(err, res, body) {
            if (err) return cb(err);

            if (res.statusCode < 200 || res.statusCode >= 300) {
                if (body && body.message) {
                    return cb(new Error(body.message));
                }

                debug(res.statusCode + ' returned from ' + method + ' ' + this.options.url + url);

                return cb(new Error('status code ' + res.statusCode + ' ' + JSON.stringify(body)));
            }

            cb(null, body);
        }.bind(this));
    },

    init: function(cb) {
        async.parallel({
            'securities': function(next) {
                debug('fetching securities');

                request({
                    url: this.options.url + '/public/securities',
                    json: true
                }, function(err, res, body) {
                    if (err) return next(err);
                    if (res.statusCode != 200) return cb(new Error('status code ' + res.statusCode + ': ' + JSON.stringify(body)));
                    this.securities = body;
                    next();
                }.bind(this))
            }.bind(this),

            'books': function(next) {
                debug('fetching books');

                request({
                    url: this.options.url + '/public/books',
                    json: true
                }, function(err, res, body) {
                    if (err) return next(err);
                    if (res.statusCode != 200) return next(new Error('status code ' + res.statusCode + ': ' + JSON.stringify(body)));
                    this.books = body;
                    next();
                }.bind(this))
            }.bind(this)
        }, cb);
    },

    createUser: function(cb) {
        var url = this.options.url + '/public/users'

        request({
            url: url,
            type: 'POST',
            json: true
        }, function(err, res, body) {
            if (err) return cb(err)
            cb(null, body)
        })
    },

    transfer: function(debitAccountId, creditAccountId, amount, cb) {
        var json = {
            debit_account_id: debitAccountId,
            credit_account_id: creditAccountId,
            amount: amount
        }

        this.send('POST', '/private/transactions', json, function(err, body) {
            if (err) return cb(err)
            cb(null, body.transaction_id)
        })
    },

    createAccount: function(securityId, cb) {
        var json = {
            security_id: securityId
        }

        this.send('POST', '/private/accounts', json, function(err, body) {
            if (err) return cb(err)
            cb(null, body.account_id)
        })
    },

    bitcoinDepositAddress: function(accountId, cb) {
        var json = {
            account_id: accountId
        }

        this.send('POST', '/private/deposit/BTC/address', json, function(err, body) {
            if (err) return cb(err)
            cb(null, body.address)
        })
    },

    orders: function(cb) {
        var self = this
        debug('retrieving orders');

        self.send('GET', '/private/orders', function(err, body) {
            if (err) return cb(err);

            cb(null, _.map(body, function(o) {
                var book = _.where(self.books, { book_id: o.book_id })[0];
                var bsec = _.where(self.securities, { security_id: book.base_security_id })[0];

                return {
                    price: num(o.price, book.scale),
                    volume: num(o.volume, bsec.scale - book.scale),
                    id: o.order_id,
                    side: o.side,
                    pair: book.base_security_id + book.quote_security_id
                };
            }))
        })
    },

    accounts: function(cb) {
        var self = this

        self.send('GET', '/private/accounts', function(err, body) {
            if (err) return cb(err);
            cb(null, body)
        })
    },

    order: function(pair, side, price, volume, cb) {
        var sec = _.where(this.securities, { security_id: pair.substr(0, 3) })[0];

        if (!sec) return cb(new Error('security not found'));

        var book = _.where(this.books, {
            base_security_id: pair.substr(0, 3),
            quote_security_id: pair.substr(3, 3)
        })[0];

        if (!book) return cb(new Error('unable to find cached book with pair ' + pair));

        debug('scale of volume ' + (sec.scale - book.scale));

        var json = {
            book_id: book.book_id,
            side: side,
            price: +price.mul(Math.pow(10, book.scale)),
            volume: +volume.mul(Math.pow(10, sec.scale - book.scale))
        };

        debug('order request ' + JSON.stringify(json, null, 4));

        this.send('POST', '/private/orders', json, function(err, body) {
            if (err) return cb(err);
            cb(null, body.order_id);
        });
    },

    cancel: function(id, cb) {
        this.send('DELETE', '/private/orders/' + id, function(err, res) {
            cb(err, res);
        });
    },

    depth: function(pair, cb) {
        if (typeof pair !== 'string') throw new Error('pair must be string')
        var book = _.where(this.books, {
            base_security_id: pair.substr(0, 3),
            quote_security_id: pair.substr(3, 3)
        })[0];

        if (!book) {
            return cb(new Error('book not found for pair ' + pair));
        }

        var bsec = _.where(this.securities, { security_id: book.base_security_id })[0];

        var url = this.options.url + '/public/books/' + book.book_id + '/depth';

        debug('looking up depth at ' + url);

        request({
            url: url,
            json: true
        }, function(err, res, data) {
            if (err) return cb(err);

            var m = function(depth) {
                return {
                    price: num(depth.price, book.scale),
                    volume: num(depth.volume, bsec.scale - book.scale)
                };
            };

            cb(null, {
                bids: _.map(data.bids, m),
                asks: _.map(data.asks, m)
            });
        });
    }
});

return Snow;