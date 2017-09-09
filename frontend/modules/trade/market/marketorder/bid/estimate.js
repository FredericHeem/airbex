var _ = require('lodash')
, debug = require('../../../../../helpers/debug')('trade:bidestimate')
, num = require('num')

exports.receive = function(market, desired) {
    var depth = api.depth[market]
    if (!depth) {
        debug('no depth available to estimate')
        return
    }
    var base = api.getBaseCurrency(market)
    , quote = api.getQuoteCurrency(market)
    , baseCurrency = _.find(api.currencies.value, { id: base })
    , basePrec = baseCurrency.scale
    , quotePrec = _.find(api.currencies.value, { id: quote }).scale

    var asks = depth.asks
    , receive = num(0)
    , remaining = num(desired)

    receive.set_precision(basePrec)
    remaining.set_precision(basePrec)

    debug('receive: desired %s', remaining.toString())
                
    var filled

    _.some(asks, function(level) {
        level = {
            price: num(level[0]),
            volume: num(level[1]),
            total: num(level[0]).mul(level[1])
        }

        filled = level.total.gte(remaining)
        debug('receive: remaining %s / %s = %s',
        		 remaining, level.price, remaining.div(level.price).set_precision(basePrec))

        var take = filled ? remaining.div(level.price).set_precision(basePrec) : level.volume

        if (take.eq(0)) {
            debug('would take zero from the level. this implies filled before')
            filled = true
            return true
        }

        receive = receive.add(take)

        debug('%s at %s', take, level.price)

        var total = level.price.mul(take)

        debug('our total %s', total)

        remaining = remaining.sub(total)

        debug('remaining after take %s', remaining)

        if (filled) {
            debug('level has filled remainder of order')
            return true
        }
    })

    if (filled) {
        debug('filled! receive %s, remaining %s',
                receive.toString(), remaining.toString());
        return {
            amount:  receive.toString(),
            remaining: remaining
        }
    } else {
        debug("not enough liquidity")
    }
}

exports.summary = function(market, amount, feeRatio) {
    var base = api.getBaseCurrency(market)
    , quote = api.getQuoteCurrency(market)
    , basePrec = api.currencies[base].scale
    , quotePrec = api.currencies[quote].scale
    , quoteDisplay = api.currencies[quote].scale_display;
    
    var amountWithoutFee = num(amount).set_precision(quotePrec).div(num('1.00000').add(feeRatio)).set_precision(quotePrec);
    debug("summary: amount with fee: %s, fee ratio: %s, amount with fees: %s", amount, feeRatio, amountWithoutFee.toString());
    var fee = num(amount).sub(amountWithoutFee).set_precision(quotePrec)
    
    var receive = exports.receive(market, amountWithoutFee.toString())

    if (!receive || !parseFloat(receive.amount)) {
        return null;
    }

    var price = amountWithoutFee
    .sub(receive.remaining)
    .div(receive.amount)
    .set_precision(quotePrec)

    debug("amount with fee: %d, amount without fee: %d, fee: %d, receive: %s, price %s",
            amount, amountWithoutFee.toString(), fee.toString(), receive.amount.toString(), price.toString());

    return {
        receive: receive.amount.toString(),
        fee: fee.toString(),
        price: price.toString(),
        amountWithoutFee:amountWithoutFee 
    }
}
