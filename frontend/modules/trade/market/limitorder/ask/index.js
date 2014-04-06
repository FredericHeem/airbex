/* global -confirm */
var num = require('num')
, template = require('./index.html')
, balanceLabel = require('../../../../shared/balance')
, validation = require('../../../../../helpers/validation')
, confirm = require('../../../../shared/modals/confirm')

module.exports = function(market) {
    var base = market.substr(0, 3)
    , quote = market.substr(3)
    , $el = $('<div class="ask">').html(template({
        base: base,
        quote: quote
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
    , feeRatio = api.feeRatio(market)
    , minAsk = 0.001;
    
    // Suggest a price from the top of the order book
    // if the user has not changed the price nor entered an amount
    function onMarketDepth(depth) {
        if (!$price.field().hasClass('has-changed') && !$amount.val().length) {
            if (depth.bids.length) {
                $price.field().val(numbers.format(depth.bids[0][0]), { thousands: false })
            } else {
                $price.field().val('')
            }
        }
    }
    
    $amount.field().on('keyup change', validate)
    
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
                numbers(values.amount,{ currency: base, precision: basePrec }), 
                numbers(values.price, { currency: quote, precision: quotePrec })))
            .then(function() {
                return values
            })
        })
        .done(function(values) {
            $submit.loading(true, i18n('markets.market.limitorder.ask.placing order'))
            $form.addClass('is-loading')

            api.call('v1/orders', {
                market: market,
                type: 'ask',
                amount: values.amount,
                price: values.price
            })
            .always(function() {
                $submit.loading(false)
                $form.removeClass('is-loading')
            })
            .fail(errors.alertFromXhr)
            .done(function() {
                // Avoid accidental re-submit by removing amount
                $amount.field().val('').focus()
                alertify.log(i18n('trade.market.order placed'))

                api.depth(market)
                api.balances()
            })
        })
    })

    // Order summary
    function getSummary() {
        var amount = numbers.parse($amount.field().val())
        , price = numbers.parse($price.field().val())
        if (!amount || !price) return null
        if (+amount < 0 || +price < 0) return null
        return {
            subtotal: num(amount).mul(num(price)).toString(),
            fee: num(amount).mul(num(feeRatio)).toString(),
            total: num(amount).mul(num(feeRatio).add(1)).toString()
        }
    }

    function summarize() {
        var $summary = $el.find('.order-summary')
        , summary = getSummary()

        if (!summary) {
            $summary.find('.subtotal').empty()
            $summary.find('.fee').empty()
            $summary.find('.total').empty('')
            return
        }

        $summary.find('.subtotal')
        .html(numbers.format(summary.subtotal, { precision: quotePrec, currency: quote }))
        .attr('title', numbers.format(summary.subtotal, {
            precision: quotePrec,
            currency: quote
        }))

        if (feeRatio === 0) {
            $summary.find('.fee')
            .css('color', 'green')
            .css('font-weight', 'bold')
            .html('FREE')
        } else {
            $summary.find('.fee')
            .html(numbers.format(summary.fee, { precision: basePrec, currency: base }))
            .attr('title', numbers.format(summary.fee, {
                precision: basePrec,
                currency: base
            }))
        }

        var totalTooHigh = num(summary.total).gt(api.balances[base].available)

        $summary.find('.total')
        .toggleClass('is-more-than-available', totalTooHigh)
        .html(numbers.format(summary.total, { precision: basePrec, currency: base }))
        .attr('title', numbers.format(summary.total, {
            precision: basePrec,
            currency: base
        }))
    }

    // Validation
    var validateAmount = validation.fromFn($el.find('.amount'), function(d, val) {
        val = numbers.parse(val)
        if (!val || val < 0) return d.reject('is-invalid')

        if(val < minAsk){
            return d.reject('is-too-small')
        }
        
        if (num(val).get_precision() > basePrec) {
            return d.reject('is-precision-too-high')
        }
        
        var withFee = num(val).mul(num('1.0000').add(feeRatio))
        , avail = api.balances[base].available

        if (withFee.gt(avail)) return d.reject('has-insufficient-funds')

        return d.resolve(val)
    })

    var validatePrice = validation.fromFn($el.find('.price'), function(d, val) {
        val = numbers.parse(val)
        if (!val || val < 0) return d.reject('is-invalid')

        if (num(val).get_precision() > quotePrec) {
            return d.reject('is-precision-too-high')
        }

        return d.resolve(val)
    })

    validation.monitorField($el.field('amount'), validateAmount)
    validation.monitorField($el.field('price'), validatePrice)

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

    // Update summary whenever a field is changed
    $form.on('keyup change', '.form-control', summarize)

    // Available label
    $el.find('.available').replaceWith(balanceLabel({
        currency: base,
        flash: true
    }).$el)

    // Sell all
    $el.on('click', '[data-action="sell-all"]', function(e) {
        e.preventDefault()
        //TODO
        var fr = num('1.0000').sub(api.feeRatio(market))
        $el.field('amount')
        .val(numbers(num(api.balances[base].available).mul(fr), {
            thousands: false,
            maxPrecision: basePrec,
            trim: true
        }))
        .trigger('change')
    })

    return ctrl
}
