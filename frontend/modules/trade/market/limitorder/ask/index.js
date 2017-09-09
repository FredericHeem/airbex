/* global -confirm */
var num = require('num')
, template = require('./index.html')
, balanceLabel = require('../../../../shared/balance')
, validation = require('../../../../../helpers/validation')
, confirm = require('../../../../shared/modals/confirm')
, debug = require('../../../../../helpers/debug')('trade:asklimit')
, _ = require('lodash');

module.exports = function(market) {
    var base = api.getBaseCurrency(market)
    , quote = api.getQuoteCurrency(market)
    , fee_ask_maker = api.marketsInfo[market].fee_ask_maker
    , fee_ask_taker = api.marketsInfo[market].fee_ask_taker
    , $el = $('<div class="ask">').html(template({
        base: base,
        quote: quote,
        fee_ask_maker: fee_ask_maker,
        fee_ask_taker: fee_ask_taker
    }))
    , ctrl = {
        $el: $el
    }
    , $form = $el.find('form')
    , $submit = $form.find('[type="submit"]')
    , $amount = $el.find('.amount')
    , $price = $el.find('.price')
    , basePrec = api.currencies[base].scale
    , quotePrec = api.currencies[quote].scale
    , quoteDisplay = api.currencies[quote].scale_display
    , askminvolume = api.marketsInfo[market].askminvolume
    , askmaxprice = api.marketsInfo[market].askmaxprice
    , askmintotal = api.marketsInfo[market].askmintotal
    , depthCurrent;
    
    // Suggest a price from the top of the order book
    // if the user has not changed the price nor entered an amount
    function onMarketDepth(depth) {
        debug("onMarketDepth");
        depthCurrent = depth;
        if (!$price.field().hasClass('has-changed') && !$amount.val().length) {
            if (depth.bids.length) {
                $price.field().val(numbers.format(depth.bids[0][0]), { thousands: false })
            } else {
                $price.field().val('')
            }
        }
    }
    
    if (num(fee_ask_maker).lte(0)) {
        $el.find('.fee-ratio-maker')
        .css('color', 'green')
    } 
    
    $price.field().on('keyup change', function() {
        $price.field().addClass('has-changed')
    })

    api.on('depth:' + market, onMarketDepth)

    $el.on('remove', function() {
        api.off('depth:' + market, onMarketDepth)
        $el = null
    })

    $el.on('submit', 'form', function(e) {
        e.preventDefault()

        validate(true)
        .then(function(values) {
            // Show "Do you really want to" dialog
            return confirm(i18n(
                'markets.market.limitorder.ask.confirm',
                numbers.formatCurrency(values.amount, base),
                numbers.formatCurrency(values.price, quote)))
            .then(function() {
                return values
            })
        })
        .done(function(values) {
            $submit.loading(true, i18n('markets.market.limitorder.ask.placingorder'))
            $form.addClass('is-loading')

            api.call('v1/orders', {
                market: market,
                type: 'ask',
                amount: values.amount,
                price: values.price
            })
            .then(function() {
                // Avoid accidental re-submit by removing amount
                $amount.field().val('').focus()
                alertify.log(i18n('trade.market.order placed'))

                api.depth(market)
                api.fetchBalances()
            })
            .fail(errors.alertFromXhr)
            .finally(function() {
                $submit.loading(false)
                $form.removeClass('is-loading')
            })
        })
    })

    function computeFee(amountLimit, priceLimit, fee_maker_ratio, fee_taker_ratio, depth) {
        debug("computeFee amount: %s, priceLimit %s, fee_maker %s, fee_taker %s",
                amountLimit, priceLimit, fee_maker_ratio, fee_taker_ratio)
        if(!depth || ! amountLimit || !priceLimit){
            return;
        }
        var bids = depth.bids;
        var totalMatch = num(0);
        var fee_taker = num(0);
        var remaining = num(amountLimit);
        
        if (bids && bids.length) {
            _.some(bids, function(level) {
                level = {
                    price: num(level[0]),
                    volume: num(level[1]),
                    total: num(level[0]).mul(level[1])
                }
                debug("computeFee: %s @ %s", level.volume.toString(), level.price.toString())
                
                if(level.price.gte(num(priceLimit))){
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
    
    // Order summary
    function getSummary() {
        debug("getSummary")
        var amount = numbers.parse($amount.field().val())
        , price = numbers.parse($price.field().val())
        if (!amount || !price) return null
        if (+amount < 0 || +price < 0) return null
        
        var fees = computeFee(
                amount,
                price,
                fee_ask_maker,
                fee_ask_taker,
                depthCurrent);
        
        if(!fees) {
            return
        }
        var totalReveivedWithFee = num(amount).set_precision(quotePrec).mul(num(price))
        var totalReveived = totalReveivedWithFee.sub(fees.fee_taker).sub(fees.fee_maker)
        return {
            price:num(price).toString(),
            totalReveived: totalReveived.toString(),
            fee_taker: fees.fee_taker.toString(),
            fee_maker: fees.fee_maker.toString(),
            subtotal: totalReveivedWithFee.toString(),
            total: amount
        }
    }

    function summarize() {
        var $summary = $el.find('.order-summary')
        , summary = getSummary()

        debug("summary: ", summary)
        if (!summary) {
        	$summary.find('.price').empty()
            $summary.find('.subtotal').empty()
            $summary.find('.fee').empty()
            $summary.find('.total-received').empty('')
            return
        }

        $summary.find('.price')
        .html(numbers.format(summary.price, { precision: quotePrec, currency: quote }))
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

        $summary.find('.total-received')
        .html(numbers.format(summary.totalReveived, { precision: quoteDisplay, currency: quote }))
        .attr('title', numbers.format(summary.totalReveived, {
            precision: quotePrec,
            currency: quote
        }))
        
        if (num(summary.fee_maker).lte(0)) {
            $summary.find('.fee-maker')
            .css('color', 'green');
        } 
        
        summary.fee_maker = num(summary.fee_maker).mul(-1).toString();
        summary.fee_taker = num(summary.fee_taker).mul(-1).toString();
        
        $summary.find('.fee-maker')
        .html(numbers.format(summary.fee_maker, { precision: quoteDisplay, currency: quote }))
        .attr('title', numbers.format(summary.fee_maker, { precision: quotePrec, currency: quote }))
        
        $summary.find('.fee-taker')
        .html(numbers.format(summary.fee_taker,  { precision: quoteDisplay, currency: quote }))
        .attr('title', numbers.format(summary.fee_taker,  { precision: quotePrec, currency: quote }))

        $summary.find('#total-too-small').addClass("hide")
        $summary.find('#total-too-high').addClass("hide")
        
        var totalTooHigh = num(summary.total).gt(api.balances[base].available)
        if(totalTooHigh){
            $summary.find('#total-too-high').removeClass("hide")
        }
        
        var totalTooLow = num(summary.subtotal).lt(askmintotal)
        if(totalTooLow){
            $summary.find('#total-too-small').removeClass("hide")
        }
        
        $summary.find('.total')
        .toggleClass('is-more-than-available', totalTooHigh)
        .toggleClass('is-too-low', totalTooLow)
        .html(numbers.format(summary.total, { precision: basePrec, currency: base }))
        .attr('title', numbers.format(summary.total, {
            precision: basePrec,
            currency: base
        }))
    }

    // Validation
    var validateAmount = validation.fromFn($el.find('.amount'), function(d, val) {
    	$amount.removeClass('has-error is-too-high is-invalid has-too-high-precision is-too-small')
    	
        val = numbers.parse(val)
        if (!val || val < 0) return d.reject('is-invalid')

        if (num(val).get_precision() > basePrec) {
            return d.reject('is-precision-too-high')
        }
        
        if(num.lt(numbers.getCurrencyNum(val, base), numbers.getCurrencyNum(askminvolume, base))){
            return d.reject('is-too-small')
        }
        
        var avail = api.balances[base].available

        if (num(val).gt(avail)) return d.reject('has-insufficient-funds')

        return d.resolve(val)
    })

    var validatePrice = validation.fromFn($el.find('.price'), function(d, val) {
    	$price.removeClass('has-error is-too-high is-invalid has-too-high-precision is-too-small')
        val = numbers.parse(val)
        if (!val || val < 0) return d.reject('is-invalid')

        if (num(val).get_precision() > quotePrec) {
            return d.reject('is-precision-too-high')
        }
        
        if(num.gt(numbers.getCurrencyNum(val, quote), numbers.getCurrencyNum(askmaxprice, quote))){
            return d.reject('is-too-high')
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
            if (+summary.total > api.balances[base].available) return d.reject()
            return d.resolve(summary.total)
        }
    })

    $form.on('keyup change', '.form-control', function() {
        validate(true)
        summarize();
    })
    
    // Available label
    $el.find('.available').replaceWith(balanceLabel({
        currency: base,
        flash: true
    }).$el)

    // Sell all
    $el.on('click', '[data-action="sell-all"]', function(e) {
        e.preventDefault()
        $el.field('amount')
        .val(numbers(num(api.balances[base].available), {
            thousands: false,
            maxPrecision: basePrec,
            trim: true
        }))
        .trigger('change')
    })

    return ctrl
}
