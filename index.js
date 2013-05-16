var util = require('util')
, EventEmitter = require('events').EventEmitter
, debug = require('debug')('margin')
, num = require('num')
, async = require('async')
, _ = require('underscore')
, Position = require('./position')
, debug = require('debug')('margin')
, Margin = module.exports = function(market, from, to, options) {
    if (typeof options.volume == 'undefined') throw new Error('volume not set')

    this.market = market
    this.from = from
    this.to = to
    this.options = _.defaults(options, {
        interval: 1000 * 60 * 5
    })

    this.position = new Position(this.market, to)
    this.tick()
}

util.inherits(Margin, EventEmitter)

Margin.prototype.sync = function(depth, cb) {
    debug('syncing')

    var desired = []

    if (depth.bids.length) {
        desired.push({
            market: this.market,
            type: 'bid',
            volume: this.options.volume,
            price: num(depth.bids[0].price).mul(1 - this.options.margin).toString()
        })

        debug('best bid %j', depth.bids[0])
    }

    if (depth.asks.length) {
        desired.push({
            market: this.market,
            type: 'ask',
            price: num(depth.asks[0].price).mul(1 + this.options.margin).toString(),
            volume: this.options.volume,
            market: this.market
        })

        debug('best ask %j', depth.asks[0])
    }

    debug('desired %j', desired)

    this.position.sync(desired, cb)
}

Margin.prototype.tick = function() {
    var that = this
    , depth

    debug('acquiring source depth for %s', this.market)

    async.waterfall([
        this.from.depth.bind(this.from, that.market),
        this.sync.bind(this)
    ], function(err) {
        if (err) return that.emit('error', err)
        debug('next tick in %d seconds', Math.round(that.options.interval / 1e3))
        that.timer = setTimeout(that.tick.bind(that), that.options.interval)
    })
}
