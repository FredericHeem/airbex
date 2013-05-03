var async = require('async')
, num = require('num')
, request = require('request')
, debug = require('debug')('snow:combiner')
, util = require('util')
_ = require('underscore')
, combiner = module.exports = function(sources) {
    this.sources = sources;
}

combiner.prototype.depth = function(pair, cb) {
    var sourcesForPair = this.sources.filter(function(x) {
        return x.pair.base.currency == pair.base.currency &&
            x.pair.quote.currency == pair.quote.currency
    })

    debug('querying ' + sourcesForPair.length + ' sources for ' + pair)

    async.map(sourcesForPair, function(source, next) {
        source.client.depth(pair, next)
    }, function(err, depths) {
        if (err) return cb(err)

        var output = {
            bids: [],
            asks: []
        }

        _.each(depths, function(v, k) {
            _.each(v.bids, function(d) {
                var item = _.where(output.bids, { price: d.price })[0]
                if (!item) {
                    item = { price: d.price, volume: num(0) }
                    output.bids.push(item)
                }

                item.volume = item.volume.add(d.volume)
            })
        })


        _.each(depths, function(v, k) {
            _.each(v.asks, function(d) {
                var item = _.where(output.asks, { price: d.price })[0]
                if (!item) {
                    item = { price: d.price, volume: num(0) }
                    output.asks.push(item)
                }

                item.volume = item.volume.add(d.volume)
            })
        })

        cb(null, output)
    })
}