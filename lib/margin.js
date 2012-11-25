var debug = require('debug')('snow:margin')
, num = require('num')
, async = require('async')
, _ = require('underscore')
, Margin = module.exports = function(pair, sep, dep, options) {
    _.extend(this, _.defaults(options || {}, {
        margin: 0.01,
        interval: 1000 * 60 * 5
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
                        volume: num(0.01),
                        side: 0,
                        pair: this.pair
                    });
                }

                if (a.asks.length) {
                    desired.push({
                        price: num(this.ceil(a.asks[0].price.mul(1 + this.margin), 2)),
                        side: 1,
                        volume: num(0.01),
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
});