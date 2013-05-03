var _ = require('underscore')
, async = require('async')
, num = require('num')
, debug = require('debug')('position')
, util = require('util')

var Position = module.exports = function(market, client) {
    this.market = market
    this.client = client
}

Position.prototype.groupOrders = function(orders) {
    var groups = []

    orders.forEach(function(order) {
        var group = groups.filter(function(group) {
            return group.side == order.side && num(group.price).eq(order.price)
        })[0]

        if (!group) {
            group = {
                price: order.price,
                orders: [],
                side: order.side,
                volume: '0'
            }

            groups.push(group)
        }

        group.orders.push(order)
        group.volume = num(group.volume).add(order.volume).toString()
    })

    return groups
}

Position.prototype.get = function(cb) {
    var that = this
    debug('fetching actual positions')

    this.client.orders(function(err, orders) {
        if (err) return cb(err)

        // Ignore orders for other markets
        var orders = orders.filter(function(o) {
            return that.market == o.market
        })

        cb(null, orders)

        /*
        debug('actual:')
        grouped.forEach(function(a) {
            debug('side=%s; price=%s; volume=%s; orders=%s',
                a.side, a.price, a.volume, a.orders.length)
        })

        debug('desired:')
        _.each(desired, function(a) {
            debug('side=%s; price=%s; volume=%s', a.side, a.price, a.volume)
        })
        */
    })
}

// Merge actual and desired
Position.prototype.merge = function(desired, actual) {
    var dps = []

    desired.forEach(function(dp) {
        dps.push(dp)

        dp.actual = actual.filter(function(ap) {
            return num(ap.price).eq(dp.price) && ap.side == dp.side
        })[0]

        if (!dp.actual) {
            dp.actual = {
                volume: '0',
                orders: []
            }
        }
    })

    actual.forEach(function(ap) {
        var exists = dps.some(function(dp) {
            return num(ap.price).eq(dp.price) &&
                ap.side == dp.side
        })

        if (exists) return

        dps.push({
            price: ap.price,
            actual: ap,
            volume: '0',
            side: ap.side
        })
    })

    return dps
}

Position.prototype.cancelOrders = function(orders, cb) {
    var that = this
    async.forEachSeries(orders, function(order, next) {
        debug('cancelling %s', order.id)
        that.client.cancel(order.id, next)
    }, cb)
}

Position.prototype.setPosition = function(position, cb) {
    var that = this
    , cancels = []
    , diff = num(position.volume).sub(position.actual.volume)
    , i = position.actual.orders.length - 1

    debug('%s @ %s: %s --> %s%s',
        position.side.toUpperCase(),
        position.price,
        position.actual.volume,
        position.volume,
        num(position.actual.volume).eq(position.volume) ? ' (no position)' : ''
    )

    while (diff.lt(0)) {
        diff = diff.add(position.actual.orders[i].volume)
        cancels.push(position.actual.orders[i--])
    }

    if (cancels.length) {
        debug('cancelling %d brings diff to %s', cancels.length, diff)
    }

    // Can be parallel, but would require more liquidity
    async.series([
        function(next) {
            if (!cancels.length) return next()
            that.cancelOrders(cancels, next)
        },
        function(next) {
            if (diff.eq(0)) return next()
            debug('making up diff with a order of %s', + diff)
            that.client.order({
                market: that.market,
                side: position.side,
                price: position.price,
                volume: diff.toString()
            }, next)
        }
    ], cb)
}

Position.prototype.setPositions = function(desired, actual, cb) {
    var merged = this.merge(desired, actual)
    async.forEachSeries(merged, this.setPosition.bind(this), cb)
}

Position.prototype.sync = function(desired, cb) {
    var that = this

    async.waterfall([
        this.get.bind(this),
        function(orders, next) {
            next(null, that.groupOrders(orders))
        },
        this.setPositions.bind(this, desired)
    ], cb)
}
