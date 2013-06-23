var async = require('async')
, num = require('num')
, debug = require('debug')('position')
, Table = require('cli-table')

var Position = module.exports = function(market, client, options) {
    this.market = market
    this.client = client
    this.options = options || {}
}

Position.prototype.groupOrders = function(orders) {
    var groups = []

    orders.forEach(function(order) {
        var group = groups.filter(function(group) {
            return group.type == order.type && num(group.price).eq(order.price)
        })[0]

        if (!group) {
            group = {
                price: order.price,
                orders: [],
                type: order.type,
                volume: '0'
            }

            groups.push(group)
        }

        group.orders.push(order)
        group.volume = num(group.volume).add(order.remaining).toString()
    })

    return groups
}

Position.prototype.get = function(cb) {
    var that = this
    debug('fetching actual positions')

    this.client.orders(function(err, orders) {
        if (err) return cb(err)

        // Ignore orders for other markets
        orders = orders.filter(function(o) {
            return that.market == o.market
        })

        cb(null, orders)
    })
}

// Merge actual and desired
Position.prototype.merge = function(desired, actual) {
    var dps = []

    desired.forEach(function(dp) {
        dps.push(dp)

        dp.actual = actual.filter(function(ap) {
            return num(ap.price).eq(dp.price) && ap.type == dp.type
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
                ap.type == dp.type
        })

        if (exists) return

        dps.push({
            price: ap.price,
            actual: ap,
            volume: '0',
            type: ap.type
        })
    })

    return dps
}

Position.prototype.cancelOrders = function(orders, cb) {
    var that = this
    async.forEach(orders, function(order, cb) {
        if (that.options.whatif) {
            debug('would cancel order %s', order.id)
            return cb()
        }

        debug('cancelling %s', order.id)

        that.client.cancel(order.id, function(err) {
            if (err) {
                if (err.message.match(/not found/)) {
                    console.log('Warning: Order %s not found when cancelling', order.id)
                    return cb()
                }
                return cb(err)
            }
            cb()
        })
    }, cb)
}

Position.prototype.setPosition = function(position, cb) {
    var that = this
    , cancels = []
    , diff = num(position.volume).sub(position.actual.volume)
    , i = position.actual.orders.length - 1

    debug('%s @ %s: %s --> %s%s',
        position.type.toUpperCase(),
        position.price,
        position.actual.volume,
        position.volume,
        num(position.actual.volume).eq(position.volume) ? ' (no position)' : ''
    )

    while (diff.lt(0)) {
        diff = diff.add(position.actual.orders[i].remaining)
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

            if (that.options.whatif) {
                debug('would make up up diff with a order of %s', diff)
                return next()
            }

            debug('making up diff with a order of %s', diff)

            that.client.order({
                market: that.market,
                type: position.type,
                price: position.price,
                amount: diff.toString()
            }, function(err) {
                if (!err) return next()
                if (err.name == 'InsufficientFunds') {
                    console.error('Insufficient funds to place %s order in %s',
                        position.type, that.market)

                    return next()
                }
                return next(err)
            })
        }
    ], cb)
}

function createTable(market, actual, desired) {
    var table = new Table({
        head: ['Market', 'Side', 'Price', 'Desired', 'Actual', 'Delta'],
        colWidths: [8, 6, 18, 18, 18, 18],
        colAligns: ['left', 'center', 'right', 'right', 'right', 'right']
    })

    var groups = []

    actual.forEach(function(a) {
        groups.push({
            type: a.type.toUpperCase(),
            price: a.price,
            actual: a,
            desired: null
        })
    })

    desired.forEach(function(d) {
        var group = groups.filter(function(g) {
            return g.price == d.price && g.type == d.type
        })[0]

        if (!group) {
            group = {
                type: d.type.toUpperCase(),
                price: d.price,
                actual: null,
                desired: d
            }
            groups.push(group)
        }
    })

    groups.sort(function(a, b) {
        if (a.price != b.price) return a.price - b.price
        return a.type - b.type
    })

    groups.forEach(function(g) {
        table.push([
            market,
            g.type,
            g.price,
            g.desired ? g.desired.volume : 0,
            g.actual ? g.actual.volume : 0,
            (g.desired ? g.desired.volume : 0) - (g.actual ? g.actual.volume : 0)
        ])
    })

    return table.toString()
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
            var actual = that.groupOrders(orders)
            console.log(createTable(that.market, actual, desired))
            next(null, actual)
        },
        this.setPositions.bind(this, desired)
    ], cb)
}
