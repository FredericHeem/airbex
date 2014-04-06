var _ = require('lodash')
, debug = require('../../../../../helpers/debug')('trade:estimate')
, num = require('num')

exports.receive = function(market, desired) {
    var depth = api.depth[market]
    if (!depth) {
        debug('no depth available to estimate')
        return
    }

    var base = market.substr(0, 3)
    , quote = market.substr(3)
    , baseCurrency = _.find(api.currencies.value, { id: base })
    , basePrec = baseCurrency.scale
    , quotePrec = _.find(api.currencies.value, { id: quote }).scale

    var asks = depth.asks
    , receive = num(0)
    , remaining = num(desired)

    receive.set_precision(basePrec)
    remaining.set_precision(quotePrec)

    var filled

    _.some(asks, function(level) {
        level = {
            price: num(level[0]),
            volume: num(level[1]),
            total: num(level[0]).mul(level[1])
        }

        filled = level.total.gte(remaining)

        // debug('%s / %s = %s', remaining, level.price, remaining.div(level.price))

        var take = filled ? remaining.div(level.price) : level.volume
        take.set_precision(level.volume.get_precision())

        if (take.eq(0)) {
            debug('would take zero from the level. this implies filled before')
            filled = true
            return true
        }

        receive = receive.add(take)

        debug('%s at %s', take, level.price)

        var total = level.price.mul(take)

        // debug('our total %s', total)

        remaining = remaining.sub(total)

        // debug('remaining after take %s', remaining)

        if (filled) {
            debug('level has filled remainder of order')
            return true
        }
    })

    if (filled) {
        debug('filled! receive %s, remaining %s',
            receive.toString(), remaining.toString())
    }

    if (filled) {
        return {
            amount:  receive.toString(),
            remaining: remaining
        }
    }
}

exports.summary = function(market, amount, feeRatio) {
    var receive = exports.receive(market, amount)
    , quote = market.substr(3)
    , quotePrec = api.currencies[quote].scale

    if (!receive || !parseFloat(receive.amount)) return null

    var price = num(amount)
    .sub(receive.remaining)
    .set_precision(quotePrec)
    .div(receive.amount)
    .set_precision(3)

    var fee = num(amount)
    .mul(feeRatio)
    .set_precision(quotePrec)

    var receiveAfter = exports.receive(market, num(amount).sub(fee)).amount

    return {
        receive: receiveAfter.toString(),
        fee: fee.toString(),
        price: price.toString()
    }
}
