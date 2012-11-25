var _ = require('underscore')
, async = require('async')
, num = require('num')
, debug = require('debug')('snow:position')
, Position = module.exports = function(ep, pair) {
    if (!pair) throw new Error('pair missing');

    debug('pair for position ' + pair);

    this.ep = ep;
    this.pair = pair;
};

_.extend(Position.prototype, {
    sync: function(desired, cb) {
        var actual;
        var ep = this.ep;

        async.series({
            'current': function(next) {
                debug('fetching actual positions');

                ep.orders(function(err, os) {
                    if (err) return cb(err);

                    os = _.where(os, { pair: this.pair });

                    var grouped = [];

                    _.each(os, function(o) {
                        var group = _.find(grouped, function(g) { return g.pair == o.pair && g.price.eq(o.price) && g.side == o.side; });

                        if (!group) {
                            group = {
                                pair: o.pair,
                                price: o.price,
                                orders: [],
                                side: o.side,
                                volume: num(0)
                            };

                            grouped.push(group);
                        }

                        group.orders.push(o);
                        group.volume = group.volume.add(o.volume);
                    });

                    actual = grouped;

                    debug('actual:');
                    _.each(actual, function(a) {
                        debug('pair=' + a.pair + '; side=' + a.side + '; pice=' + a.price.toString() + '; volume=' + a.volume.toString() +
                            '; orders=' + a.orders.length);
                    });

                    debug('desired:');
                    _.each(desired, function(a) {
                        debug('pair=' + a.pair + '; side=' + a.side + '; pice=' + a.price.toString() + '; volume=' + a.volume.toString());
                    });

                    next();
                }.bind(this));
            }.bind(this),

            'adjust': function(next) {
                var dps = [];
                debug('preparing to adjust');

                _.each(desired, function(dp) {
                    dps.push(dp);
                    dp.actual = _.find(actual, function(ap) { return ap.pair == dp.pair && ap.price.eq(dp.price) && ap.side == dp.side; });
                    if (!dp.actual) {
                        dp.actual = {
                            volume: num(0),
                            orders: []
                        }
                    }
                });

                _.each(actual, function(ap) {
                    if (_.any(dps, function(dp) { return ap.pair == dp.pair && ap.price.eq(dp.price) && ap.side == dp.side; })) {
                        return;
                    }

                    dps.push({
                        pair: ap.pair,
                        price: ap.price,
                        actual: ap,
                        volume: num(0)
                    });
                });

                async.forEach(dps, function(dp, next) {
                    debug(dp.pair + ' ' + (dp.side?'ASK':'BID') + ' @' + dp.price.toString() + ': ' + dp.actual.volume.toString() + ' --> ' + dp.volume.toString() + (dp.actual.volume.eq(dp.volume) ? ' (unchanged)' : ''));

                    var cancels = [];
                    var diff = dp.volume.sub(dp.actual.volume);
                    var i = dp.actual.orders.length - 1;

                    while (diff.lt(0)) {
                        diff = diff.add(dp.actual.orders[i].volume);
                        cancels.push(dp.actual.orders[i--]);
                    }

                    if (cancels.length) {
                        debug('cancelling ' + cancels.length + ' brings diff to ' + diff.toString());
                    }

                    async.parallel({
                        'cancel': function(next) {
                            async.forEach(cancels, function(o, next) {
                                debug('cancelling ' + o.id);
                                ep.cancel(o.id, next);
                            }, next);
                        },

                        'create': function(next) {
                            if (diff.eq(0)) return next();

                            debug('making up diff with a order of ' + diff.toString());
                            debug('(side ' + dp.side + ' )');
                            ep.order(dp.pair, dp.side, dp.price, diff, next);
                        }
                    }, next);
                }, next);
            }
        }, function(err) {
            cb(err);
        });
    }
});