var _ = require('lodash')
, debug = require('../../../../../helpers/debug')('trade:estimate')
, num = require('num')

exports.receive = function(market, amount) {
    var receive = 0
    , filled
    if (!api.depth[market].bids.length) {
        debug('no bids available')
        return
    }
    _.some(api.depth[market].bids, function(level) {
        var price = +level[0]
        , volume = +level[1]
        filled = volume >= amount
        var take = filled ? amount : volume
        amount -= take
        receive += take * price
        debug('%s @ %s (%s). %s remaining', take, price, take * price, amount)
        return amount === 0
    })

    debug('Filled? %s', filled)
    return filled ? receive.toString() : null
}

exports.summary = function(market, amount, feeRatio) {
    // The receive amount is based
    var receive = +exports.receive(market, amount * (1 - feeRatio))
    if (receive <= 0) return null
    var base = market.substr(0, 3)
    , baseScale = api.currencies[base].scale
    , fee = amount * feeRatio

    debug('receive %s * (1+fee) = %s', receive, num(receive).mul(num('1.0000').add(feeRatio)).toString())

    return {
        receive: receive,
        fee: fee.toFixed(baseScale),
        price: (exports.receive(market, amount * (1-feeRatio)) / (amount*(1-feeRatio))).toFixed(api.markets[market].scale)
    }
}
