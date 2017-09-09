var _ = require('lodash')
, debug = require('../../../../../helpers/debug')('trade:askestimate')
, num = require('num')

exports.receive = function(market, amount) {
	
    var depth = api.depth[market]
    if (!depth) {
        return
    }
    debug('receive amount %s', amount)
    var receive = num(0)
    , remaining = num(amount)
    , is_filled
    
    var bids = depth.bids;
    if (!bids || !bids.length) {
        debug('no bids available')
        return
    }
    _.some(bids, function(level) {
        var price = num(level[0])
        , volume = num(level[1])
        is_filled = volume.gte(remaining)
        var take = is_filled ? remaining : volume
        remaining = remaining.sub(take)
        receive = receive.add(take.mul(price))
        debug('%s @ %s (%s). %s remaining, %s received', take.toString(), 
        		price.toString(), take.mul(price).toString(), remaining.toString(), receive.toString())
        if (is_filled) {
            return true
        }
    })

    if (is_filled) {
    	debug('filled! receive %s, remaining %s',
                receive.toString(), remaining.toString())
        return {
            amount:  receive.toString(),
            remaining: remaining.toString()
        }
    } else {
    	debug("NOT filled remaining: %s ", remaining.toString())
    }
}

exports.summary = function(market, amountToSell, feeRatio) {
	debug('summary: amount to sell %s, feeRatio %s', amountToSell, feeRatio);
    var receive = exports.receive(market, amountToSell)
    
    if (!receive || num(receive.amount).lte(0)) {
    	return null
    }
    
    var amountToReceive = num(receive.amount).mul(num('1.00000000').sub(feeRatio))
    
    debug('summary: receive %d, with fees %d', amountToReceive, receive.amount)
    
    var base = api.getBaseCurrency(market)
    , baseScale = api.currencies[base].scale
    , quote = api.getQuoteCurrency(market)
    , quoteScale = api.currencies[quote].scale
    , fee = num(receive.amount).mul(num(feeRatio));
    
    fee.set_precision(quoteScale)
    
    var price = num(receive.amount).div(amountToSell)
    price.set_precision(quoteScale)
    debug('summary price %s, fee %s', price.toString(), fee.toString())
    return {
        receive: amountToReceive,
        fee: fee.toString(),
        price: price.toString()
    }
}
