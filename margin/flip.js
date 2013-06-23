var num = require('num')
, debug = require('debug')('flip')
, Flip = module.exports = function(inner) {
    this.inner = inner
}

var flipPair = function(s) {
    return s.substr(3) + s.substr(0, 3)
}

var flipSide = function(s) {
    return {
        bid: 'ask',
        ask: 'bid'
    }[s]
}

// flipped order will have same precision (both price and volume)
// as the original order
var flipOrder = function(order, side) {
    var price = num(order.price)
    var one = num(1)
    one.set_precision(price.get_precision())

    var volume = num(order.volume)
    , flippedVolume = volume.mul(price)
    flippedVolume.set_precision(volume.get_precision())

    var flippedOrder = {
        price: one.div(price).toString(),
        volume: flippedVolume.toString()
    }

    if (side || order.side) flippedOrder.side = flipSide(order.side || side)
    if (order.market) flippedOrder.market = flipPair(order.market)

    return flippedOrder
}

Flip.prototype.depth = function(market, cb) {
    this.inner.depth(flipPair(market), function(err, depth) {
        if (err) return cb(err)

        debug('best bid %j', depth.bids[0])
        debug('best ask %j', depth.asks[0])

        cb(null, {
            bids: depth.asks.map(function(order) {
                return flipOrder(order, 'bid')
            }),
            asks: depth.bids.map(function(order) {
                return flipOrder(order, 'ask')
            })
        })
    })
}
