var async = require('async')
, num = require('num')
, request = require('request')
, debug = require('debug')('snow:fx')
, util = require('util')
_ = require('underscore')
, fx = module.exports = function(inner, base, quote, ref) {
    this.inner = inner;
    this.base = base;
    this.quote = quote;
    this.ref = ref;
};

fx.prototype.depth = function(pair, cb) {
    var rate, depth;

    async.parallel({
        'rate': function(next) {
            request({
                url: 'http://www.google.com/ig/calculator?hl=en&q=1' + this.ref + '=?' + this.quote,
                json: true
            }, function(err, res, data) {
                if (err) return next(err);
                rate = num(data.match(/rhs\:\s*\"([\d\.]+)/)[1])
                debug('exchange rate found at ' + rate.toString());
                next();
            });
        }.bind(this),

        'depth': function(next) {
            debug('finding depth for ' + this.base + this.ref);

            this.inner.depth(this.base + this.ref, function(err, o) {
                if (err) return next(err);
                depth = o;
                next();
            });
        }.bind(this)
    }, function(err) {
        if (err) return cb(err);

        var bid = depth.bids[0];
        var ask = depth.asks[0];
        var outputs = { asks: [], bids: [] };

        if (bid) {
            outputs.bids.push({
                price: bid.price.mul(rate),
                volume: bid.volume.mul(rate)
            });
        }

        if (ask) {
            outputs.asks.push({
                price: ask.price.mul(rate),
                volume: ask.volume.mul(rate)
            });
        }

        cb(null, outputs);
    });
};