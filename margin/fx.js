var async = require('async')
, num = require('num')
, request = require('request')
, debug = require('debug')('snow:fx')
, fx = module.exports = function(inner, ref) {
    this.inner = inner;
    this.ref = ref;
};

fx.prototype.depth = function(market, cb) {
    var that = this, rate, depth
    , url = 'http://www.google.com/ig/calculator?hl=en&q=1' +
        this.ref + '=?' + market.substr(3)

    async.parallel({
        'rate': function(next) {
            request({
                url: url,
                json: true
            }, function(err, res, data) {
                if (err) return next(err);
                rate = num(data.match(/rhs\:\s*\"([\d\.]+)/)[1])
                debug('exchange rate found at ' + rate.toString());
                next();
            });
        },

        'depth': function(next) {
            debug('finding depth for ' + market.substr(0, 3) + that.ref);

            that.inner.depth(market.substr(0, 3) + that.ref, function(err, o) {
                if (err) return next(err);
                depth = o;
                next();
            });
        }
    }, function(err) {
        if (err) return cb(err);

        var bid = depth.bids[0];
        var ask = depth.asks[0];
        var outputs = { asks: [], bids: [] };

        if (bid) {
            outputs.bids.push({
                price: num(bid.price).mul(rate).toString(),
                volume: num(bid.volume).mul(rate).toString()
            });
        }

        if (ask) {
            outputs.asks.push({
                price: num(ask.price).mul(rate).toString(),
                volume: num(ask.volume).mul(rate).toString()
            });
        }

        cb(null, outputs);
    })
}
