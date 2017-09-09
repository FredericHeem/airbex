/* global -confirm */
var num = require('num')
, template = require('./index.html')
, balanceLabel = require('../../../../shared/balance')
, validation = require('../../../../../helpers/validation')
, confirm = require('../../../../shared/modals/confirm')
, debug = require('../../../../../helpers/debug')('trade:bidlimit')
, _ = require('lodash');

module.exports = exports = function(market) {
    var base = api.getBaseCurrency(market)
    , quote = api.getQuoteCurrency(market)
    , fee_bid_maker = api.marketsInfo[market].fee_bid_maker
    , fee_bid_taker = api.marketsInfo[market].fee_bid_taker
    , $el = $('<div class="bid">').html(template({
        base: base,
        quote: quote,
        fee_bid_maker: fee_bid_maker,
        fee_bid_taker: fee_bid_taker
    }))
    , ctrl = {
        $el: $el
    }
    , $form = $el.find('form')
    , $amount = $el.find('.amount')
    , $price = $el.find('.price')
    , $submit = $form.find('[type="submit"]')
    , quotePrec = api.currencies[quote].scale
    , quoteDisplay = api.currencies[quote].scale_display
    , basePrec = api.currencies[base].scale
    , bidminvolume = api.marketsInfo[market].bidminvolume
    , bidminprice = api.marketsInfo[market].bidminprice
    , bidmintotal = api.marketsInfo[market].bidmintotal
    , depthCurrent;
    
    if (num(fee_bid_maker).lte(0)) {
        $el.find('.fee-ratio-maker')
        .css('color', 'green')
    } 
    
    $form.on('submit', function(e) {
        e.preventDefault()

        $form.addClass('is-loading')

        validate(true)
        .then(function(values) {
            // Show "Do you really want to buy?" dialog
            return confirm(i18n(
                'markets.market.limitorder.bid.confirm',
                numbers.formatCurrency(values.amount, base),
                numbers.formatCurrency(values.price, quote)))
            .then(function() {
                return values
            })
        })
        .always(function() {
            $form.removeClass('is-loading')
            $amount.field().focus()
        })
        .done(function(values) {
            $submit.loading(true, i18n('markets.market.marketorder.bid.placing order'))

            return api.call('v1/orders', {
                market: market,
                type: 'bid',
                amount: values.amount,
                price: values.price
            })
            .then(function() {
                api.depth(market)
                api.fetchBalances()

                alertify.log(i18n('trade.market.order placed'))
                $amount.field().val('')
            })
            .fail(errors.alertFromXhr)
            .finally(function() {
                $submit.loading(false)
            })

        })
    })
    
    function computeFee(amountLimit, priceLimit, fee_maker_ratio, fee_taker_ratio, depth) {
        debug("computeFee amount: %s, priceLimit %s, fee_maker %s, fee_taker %s",
                amountLimit, priceLimit, fee_maker_ratio, fee_maker_ratio)
        if(!depth || ! amountLimit || !priceLimit){
            return;
        }
        var asks = depth.asks;
        var totalMatch = num(0);
        var fee_taker = num(0);
        var remaining = num(amountLimit);
        
        if (asks && asks.length) {
            _.some(asks, function(level) {
                level = {
                    price: num(level[0]),
                    volume: num(level[1]),
                    total: num(level[0]).mul(level[1])
                }
                debug("computeFee: %s @ %s", level.volume.toString(), level.price.toString())
                
                if(level.price.lte(num(priceLimit))){
                    var is_filled = level.volume.gte(remaining)
                    var take = is_filled ? remaining : level.volume
                    remaining = remaining.sub(take)
                    var takeAll = remaining.gt(level.volume);
                    totalMatch = totalMatch.add(level.volume);
                    fee_taker = fee_taker.add(take.mul(level.price).mul(num(fee_taker_ratio)));
                    debug("subtotal %s, fee taker %s, remaining %s", 
                            totalMatch.toString(), fee_taker.toString(), remaining.toString())
                } else {
                    debug("computeFee done")
                    return true;
                }
            })  
        } 
        
        var fee_maker = remaining.mul(priceLimit).mul(fee_maker_ratio);
        debug("computeFee taker: %s, maker %s", fee_taker.toString(), fee_maker.toString())
        return {
            fee_taker:fee_taker.toString(),
            fee_maker:fee_maker.toString()
        }
    }
    function getSummary() {
        var amount = numbers.parse($amount.field().val())
        , price = numbers.parse($price.field().val())
        if (!amount || !price) return null
        if (+amount < 0 || +price < 0) return null;
        
        var fees = computeFee(
                amount,
                price,
                fee_bid_maker,
                fee_bid_taker,
                depthCurrent);
        
        if(!fees) return;
        var subtotal = num(amount).mul(num(price))
        var total = subtotal.add(fees.fee_taker).add(fees.fee_maker)
        return {
            price:num(price).toString(),
            subtotal: subtotal.toString(),
            fee_taker: fees.fee_taker.toString(),
            fee_maker: fees.fee_maker.toString(),
            total: total.toString()
        }
    }

    function summarize() {
        var $summary = $el.find('.order-summary')
        , summary = getSummary()

        if (!summary) {
        	$summary.find('.price').empty()
            $summary.find('.subtotal').empty()
            $summary.find('.fee-maker').empty()
            $summary.find('.fee-taker').empty()
            $summary.find('.total').empty('')
            return
        }

        $summary.find('.price')
        .html(numbers.format(summary.price, { precision: quoteDisplay, currency: quote }))
        .attr('price', numbers.format(summary.price, {
            precision: quotePrec,
            currency: quote
        }))
        
        $summary.find('.subtotal')
        .html(numbers.format(summary.subtotal, { precision: quoteDisplay, currency: quote }))
        .attr('title', numbers.format(summary.subtotal, {
            precision: quotePrec,
            currency: quote
        }))

        if (num(summary.fee_maker).lte(0)) {
            $summary.find('.fee-maker')
            .css('color', 'green')
        } 
        $summary.find('.fee-maker')
        .html(numbers.format(summary.fee_maker, { precision: quoteDisplay, currency: quote }))
        .attr('title', numbers.format(summary.fee_maker, { precision: quotePrec, currency: quote }))
        
        $summary.find('.fee-taker')
        .html(numbers.format(summary.fee_taker, { precision: quoteDisplay, currency: quote }))
        .attr('title', numbers.format(summary.fee_taker, { precision: quotePrec, currency: quote }))
        
        $summary.find('#total-too-small').addClass("hide")
        $summary.find('#total-too-high').addClass("hide")
        
        var totalTooHigh = num(summary.total).gt(api.balances[quote].available)
        if(totalTooHigh){
            $summary.find('#total-too-high').removeClass("hide")
        }
        
        var totalTooLow = num(summary.total).lt(bidmintotal)
        if(totalTooLow){
            $summary.find('#total-too-small').removeClass("hide")
        }
        
        $summary.find('.total')
        .toggleClass('is-more-than-available', totalTooHigh)
        .toggleClass('is-too-low', totalTooLow)
        .html(numbers.format(summary.total, { precision: quoteDisplay, currency: quote }))
        .attr('title', numbers.format(summary.total, {
            precision: quotePrec,
            currency: quote
        }))
    }

    $el.on('click', '[data-action="spend-all"]', function(e) {
        e.preventDefault()
        $form.field('amount')
        .val(numbers.format(api.balances[quote].available))
        .trigger('change')
    })


    
    // Suggest a price from the top of the order book
    // if the user has not changed the price nor entered an amount
    function onMarketDepth(depth) {
        depthCurrent = depth;
        if (!$price.field().hasClass('has-changed') &&
            !$amount.field().val().length &&
            !$price.field().val().length)
        {
            if (depth.asks.length) {
                $price.field().val(numbers.format(depth.asks[0][0]), { thousands: false })
            } else {
                $price.field().val('')
            }
        }
    }
    

    
    $price.on('keyup change', function() {
        $price.field().addClass('has-changed')
    })

    api.on('depth:' + market, onMarketDepth)

    var validateAmount = validation.fromFn($el.find('.amount'), function(d, val) {
    	$amount.removeClass('has-error is-too-high is-invalid has-too-high-precision is-too-small')
        val = numbers.parse(val)
        if (!val || val < 0) return d.reject('is-invalid')

        if(num.lt(numbers.getCurrencyNum(val, base), numbers.getCurrencyNum(bidminvolume, base))){
            return d.reject('is-too-small')
        }
        
        if (num(val).get_precision() > basePrec) {
            return d.reject('is-precision-too-high')
        }

        return d.resolve(val)
    })

    var validatePrice = validation.fromFn($el.find('.price'), function(d, val) {
    	$price.removeClass('has-error is-too-high is-invalid has-too-high-precision is-too-small')
        val = numbers.parse(val)
        if (!val || val < 0) return d.reject('is-invalid')

        if(num.lt(numbers.getCurrencyNum(val, quote), numbers.getCurrencyNum(bidminprice, quote))){
            return d.reject('is-too-small')
        }
        
        if (num(val).get_precision() > quotePrec) {
            return d.reject('is-precision-too-high')
        }

        return d.resolve(val)
    })

    var validate = validation.fromFields({
        amount: validateAmount,
        price: validatePrice,
        total: function() {
            var d = $.Deferred()
            , summary = getSummary()
            if (!summary) return d.reject()
            if (+summary.total <= 0) return d.reject()
            if (+summary.total > api.balances[quote].available) return d.reject()
            return d.resolve(summary.total)
        }
    })

    // Re-summarize on any input change
    $form.on('keyup change', '.form-control', function() {
        validate(true)
        summarize();
    })

    $el.find('.available').replaceWith(balanceLabel({
        currency: quote,
        flash: true
    }).$el)

    $el.on('remove', function() {
        api.off('depth:' + market, onMarketDepth)
        $el = null
    })

    return ctrl
}
