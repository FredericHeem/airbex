var debug = require('debug')('snow:margin')
, num = require('num')
, async = require('async')
, _ = require('underscore')
, Margin = module.exports = function(pair, sep, dep, options) {
    _.extend(this, _.defaults(options || {}, {
        margin: 0.01,
        interval: 1000 * 60 * 5,
        volume: 1
    }));

    this.pair = pair;
    this.sep = sep;
    this.bpos = new (require('./position'))(dep, this.pair);

    debug('margin trader created for pair ' + pair);

    this.tick();
};

_.extend(Margin.prototype, {
    ceil: function(n, p) {
        return Math.ceil(n * Math.pow(10, p)) / Math.pow(10, p);
    },

    floor: function(n, p) {
        return Math.floor(n * Math.pow(10, p)) / Math.pow(10, p);
    },

    tick: function() {
        var a;

        debug('ticking margin');

        async.series({
            'prices': function(next) {
                if (!this.sep) {
                    debug('there is no source, assuming same currency')
                    if (this.pair.base.currency !== this.pair.quote.currency) {
                        throw new Error('no source and not same currency')
                    }

                    a = {
                        bids: [{
                            price: num(1),
                            side: 1,
                            volume: num(1),
                            pair: this.pair
                        }],
                        asks: [{
                            price: num(1),
                            side: 0,
                            volume: num(1),
                            pair: this.pair
                        }]
                    }
                    return next()
                }

                debug('obtaining source prices');

                this.sep.depth(this.pair, function(err, depth) {
                    if (err) return next(err);
                    debug('source prices obtained');
                    a = depth;
                    next();
                });
            }.bind(this),

            'sync': function(next) {
                debug('syncing');
                var desired = [];

                if (a.bids.length) {
                    desired.push({
                        price: num(this.floor(a.bids[0].price.mul(1 - this.margin), 2)),
                        volume: num(this.volume),
                        side: 0,
                        pair: this.pair
                    });
                }

                if (a.asks.length) {
                    desired.push({
                        price: num(this.ceil(a.asks[0].price.mul(1 + this.margin), 2)),
                        side: 1,
                        volume: num(this.volume),
                        pair: this.pair
                    });
                }

                this.bpos.sync(desired, next);
            }.bind(this)
        }, function(err) {
            if (err) console.error('tick failed', err, err.stack);
            debug('scheduling next tick');
            setTimeout(this.tick.bind(this), this.interval);
        }.bind(this));
    }
})